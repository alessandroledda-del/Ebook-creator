function validateEnv(env = process.env) {
  const errors = [];

  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET deve essere presente e lungo almeno 32 caratteri');
  }

  if (!env.MONGO_URI || !/^mongodb(\+srv)?:\/\/.+/.test(env.MONGO_URI)) {
    errors.push('MONGO_URI deve essere una stringa di connessione MongoDB valida');
  }

  const nodeEnv = env.NODE_ENV || 'development';
  if (!['development', 'staging', 'production'].includes(nodeEnv)) {
    errors.push('NODE_ENV deve essere development, staging o production');
  }

  if (env.PORT !== undefined) {
    const port = Number(env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push('PORT deve essere un numero intero tra 1 e 65535');
    }
  }

  if (env.ALLOWED_ORIGINS) {
    const origins = env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
    const invalidOrigins = origins.filter((origin) => {
      try {
        const url = new URL(origin);
        return !['http:', 'https:'].includes(url.protocol);
      } catch {
        return true;
      }
    });

    if (invalidOrigins.length > 0) {
      errors.push('ALLOWED_ORIGINS contiene URL non valide');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configurazione ambiente non valida:\n- ${errors.join('\n- ')}`);
  }
}

module.exports = validateEnv;
