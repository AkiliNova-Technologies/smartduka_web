export function getDevSession() {
  return {
    user: {
      id: "dev-user-1",
      name: "Development Admin",
      email: "admin@smartduka.dev",
      role: "admin" as const,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function isDevMode() {
  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';
}