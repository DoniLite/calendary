import { Client } from '@stomp/stompjs'

export function createNotificationSocketClient(userId: string, onNotification: () => void): Client {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const brokerURL = `${protocol}//${window.location.host}/ws/notifications`

  const client = new Client({
    brokerURL,
    reconnectDelay: 5_000,
    onConnect: () => {
      client.subscribe(`/topic/users/${userId}/notifications`, onNotification)
    },
  })

  return client
}
