ALTER TABLE "UserSettings"
ADD COLUMN "themeMode" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT 'classic';
