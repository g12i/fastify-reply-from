'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const From = require('..')
const got = require('got')

test('http -> http2 crash', async (t) => {
  const instance = Fastify()

  t.teardown(instance.close.bind(instance))

  const target = Fastify({
    http2: true
  })

  target.get('/', (_request, reply) => {
    t.pass('request proxied')
    reply.code(200).send({
      hello: 'world'
    })
  })

  instance.get('/', (_request, reply) => {
    reply.from()
  })

  t.teardown(target.close.bind(target))

  await target.listen({ port: 0 })

  instance.register(From, {
    base: `http://localhost:${target.server.address().port}`,
    http2: true
  })

  await instance.listen({ port: 0 })

  try {
    await target.close()
    await got(`http://localhost:${instance.server.address().port}`)
  } catch (err) {
    t.equal(err.response.statusCode, 503)
    t.match(err.response.headers['content-type'], /application\/json/)
    t.same(JSON.parse(err.response.body), {
      statusCode: 503,
      code: 'FST_REPLY_FROM_SERVICE_UNAVAILABLE',
      error: 'Service Unavailable',
      message: 'Service Unavailable'
    })
    return
  }
  t.fail()
})
