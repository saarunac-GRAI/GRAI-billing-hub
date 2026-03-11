self.addEventListener('push', function (event) {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Billing Hub', body: event.data.text(), url: '/' }
  }

  const options = {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    data: { url: payload.url || '/' },
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Billing Hub', options)
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(clients.openWindow(url))
})
