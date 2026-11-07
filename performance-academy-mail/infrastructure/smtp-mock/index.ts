/**
 * Performance Academy Mail (PAM) - RFC 5321 Mock SMTP Server
 * Enables 100% local end-to-end testing without external network access or port 25.
 */

import net from "node:net";

export interface DeliveredMockMessage {
  from: string;
  mailFrom: string;
  to: string[];
  rcptTo: string[];
  data: string;
  timestamp: Date;
}

export interface MockSmtpServerOptions {
  port?: number;
  host?: string;
  simulatedBehavior?: "OK" | "DEFER_421" | "BOUNCE_550" | "SPAM_554";
}

export class MockSmtpServer {
  private server: net.Server | null = null;
  private deliveredMessages: DeliveredMockMessage[] = [];
  private port: number;
  private host: string;
  private defaultBehavior: "OK" | "DEFER_421" | "BOUNCE_550" | "SPAM_554";
  private recipientBehaviors = new Map<string, "OK" | "DEFER_421" | "BOUNCE_550" | "SPAM_554">();

  constructor(options: MockSmtpServerOptions = {}) {
    this.port = options.port ?? 0; // 0 = dynamic free port from OS
    this.host = options.host || "127.0.0.1";
    this.defaultBehavior = options.simulatedBehavior || "OK";
  }

  public setBehavior(behavior: "OK" | "DEFER_421" | "BOUNCE_550" | "SPAM_554") {
    this.defaultBehavior = behavior;
  }

  public setBehaviorForRecipient(recipient: string, behavior: "OK" | "DEFER_421" | "BOUNCE_550" | "SPAM_554") {
    this.recipientBehaviors.set(recipient.toLowerCase(), behavior);
  }

  public getDeliveredMessages(): DeliveredMockMessage[] {
    return this.deliveredMessages;
  }

  public clearMessages(): void {
    this.deliveredMessages = [];
  }

  public getPort(): number {
    return this.port;
  }

  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        let state: "GREETING" | "MAIL" | "RCPT" | "DATA" = "GREETING";
        let from = "";
        let recipients: string[] = [];
        let dataBuffer = "";

        socket.write("220 mail.perfacademy.ma ESMTP Performance Academy Mock Mailer\r\n");

        socket.on("data", (chunk) => {
          const text = chunk.toString();

          if (state === "DATA") {
            dataBuffer += text;
            if (dataBuffer.includes("\r\n.\r\n")) {
              const fullData = dataBuffer.slice(0, dataBuffer.indexOf("\r\n.\r\n"));
              this.deliveredMessages.push({
                from,
                mailFrom: from,
                to: [...recipients],
                rcptTo: [...recipients],
                data: fullData,
                timestamp: new Date(),
              });
              dataBuffer = "";
              state = "MAIL";
              socket.write("250 2.0.0 OK: Message accepted for delivery\r\n");
            }
            return;
          }

          const lines = text.split("\r\n").filter(Boolean);
          for (const line of lines) {
            const upper = line.toUpperCase();

            if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
              socket.write("250-mail.perfacademy.ma greets you\r\n250-8BITMIME\r\n250-SIZE 35882432\r\n250 OK\r\n");
              state = "MAIL";
            } else if (upper.startsWith("MAIL FROM:")) {
              from = line.slice(10).trim().replace(/[<>]/g, "");

              if (this.defaultBehavior === "DEFER_421") {
                socket.write("421 4.7.0 Try again later, service is busy\r\n");
                return;
              }

              socket.write("250 2.1.0 Sender OK\r\n");
              state = "RCPT";
            } else if (upper.startsWith("RCPT TO:")) {
              const rcpt = line.slice(8).trim().replace(/[<>]/g, "");
              const behavior = this.recipientBehaviors.get(rcpt.toLowerCase()) || this.defaultBehavior;

              if (behavior === "BOUNCE_550") {
                socket.write("550 5.1.1 <" + rcpt + ">: Recipient address rejected: User unknown in virtual mailbox table\r\n");
                return;
              }

              if (behavior === "DEFER_421") {
                socket.write("421 4.7.0 <" + rcpt + ">: Try again later, mailbox concurrency limit reached\r\n");
                return;
              }

              if (behavior === "SPAM_554") {
                socket.write("554 5.7.1 Message rejected due to content policy violation\r\n");
                return;
              }

              recipients.push(rcpt);
              socket.write("250 2.1.5 Recipient OK\r\n");
            } else if (upper === "DATA") {
              state = "DATA";
              socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
            } else if (upper === "RSET") {
              from = "";
              recipients = [];
              dataBuffer = "";
              state = "MAIL";
              socket.write("250 2.0.0 OK Reset\r\n");
            } else if (upper === "QUIT") {
              socket.write("221 2.0.0 Bye\r\n");
              socket.end();
            } else if (upper === "NOOP") {
              socket.write("250 2.0.0 OK\r\n");
            } else {
              socket.write("500 5.5.1 Command unrecognized\r\n");
            }
          }
        });

        socket.on("error", () => {});
      });

      this.server.on("error", (err) => reject(err));

      this.server.listen(this.port, this.host, () => {
        const address = this.server?.address();
        if (address && typeof address === "object") {
          this.port = address.port;
        }
        resolve(this.port);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }
}
