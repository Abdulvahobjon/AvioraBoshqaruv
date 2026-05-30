import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Socket.io gateway. Clients connect with `auth.token` (JWT access token).
 * Each user joins a room `user:<id>`; server emits notifications to that room.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('WS');

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      const payload = await this.jwt.verifyAsync(token as string, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect() {}

  /** Push a notification to a specific user's room. */
  emitToUser(userId: number, event: string, payload: any) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
