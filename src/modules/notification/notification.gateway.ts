import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // hoặc domain frontend của bạn
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Lưu map userId <-> socketId
  private connectedUsers = new Map<string, string>();

  // Khi client connect
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  // Khi client disconnect
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Xóa user khỏi map
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  // Client gửi sự kiện để đăng ký userId
  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.connectedUsers.set(userId, client.id);
    console.log(`User ${userId} registered with socket ${client.id}`);
  }

  // Hàm gửi thông báo tới userId cụ thể
  sendNotificationToUser(userId: string, message: string) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', { message });
      console.log(`Notification sent to user ${userId}`);
    }
  }
}
