'use strict'

const t = require('tap')
const Fastify = require('fastify')
const From = require('..')
const got = require('got')

t.autoend(false)

const target = Fastify()
t.tearDown(target.close.bind(target))

target.get('/', (request, reply) => {
  t.pass('request arrives')

  setTimeout(() => {
    reply.status(200).send('hello world')
    t.end()
  }, 1000)
})

async function main () {
  await target.listen(0)

  const instance = Fastify()
  t.tearDown(instance.close.bind(instance))

  instance.register(From, { http: { requestOptions: { timeout: 100 } } })

  instance.get('/', (request, reply) => {
    reply.from(`http://localhost:${target.server.address().port}/`)
  })

  await instance.listen(0)

  try {
    await got.get(`http://localhost:${instance.server.address().port}/`, { retry: 0 })
  } catch (err) {
    t.equal(err.response.statusCode, 504)
    t.equal(err.response.body, 'Gateway Timeout')

    return
  }

  t.fail()
}

main()
