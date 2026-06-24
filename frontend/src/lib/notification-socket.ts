import { Client } from '@stomp/stompjs'

export function createNotificationSocketClient(userId: string, onNotification: () => void): Client {
  const base = window.__API_BASE_URL__
  const brokerURL = base
    ? `${base.replace(/^http/, 'ws')}/ws/notifications`
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/notifications`

  const client = new Client({
    brokerURL,
    reconnectDelay: 5_000,
    onConnect: () => {
      client.subscribe(`/topic/users/${userId}/notifications`, onNotification)
    },
  })

  return client
}
