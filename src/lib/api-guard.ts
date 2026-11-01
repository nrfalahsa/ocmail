import { NextRequest } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { hashApiKey } from "./api-key";

export interface AuthContext {
  userId: string | null;
  role: "USER" | "ADMIN" | "ANONYMOUS";
  isApiKey: boolean;
  apiKeyId?: string;
}

export async function authenticateRequest(req: NextRequest): Promise<AuthContext> {
  // 1. Check API Key header
  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");
  const rawKey = xApiKey || (authHeader?.startsWith("Bearer ocm_") ? authHeader.replace("Bearer ", "").trim() : null);

  if (rawKey && rawKey.startsWith("ocm_")) {
    const keyHash = hashApiKey(rawKey);
    try {
      const foundKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { user: true },
      });

      if (foundKey) {
        // Asynchronously increment request count & last used
        prisma.apiKey
          .update({
            where: { id: foundKey.id },
            data: {
              requestsCount: { increment: 1 },
              lastUsedAt: new Date(),
            },
          })
          .catch(() => {});

        return {
          userId: foundKey.userId,
          role: foundKey.user.role,
          isApiKey: true,
          apiKeyId: foundKey.id,
        };
      }
    } catch {
      // ignore db error in unconfigured state
    }
  }

  // 2. Check Session
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        userId: session.user.id,
        role: session.user.role || "USER",
        isApiKey: false,
      };
    }
  } catch {
    // ignore
  }

  return {
    userId: null,
    role: "ANONYMOUS",
    isApiKey: false,
  };
}
