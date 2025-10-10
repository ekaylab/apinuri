import { app } from './app';

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`🚀 Elysia server running on http://localhost:${PORT}`);
  console.log(`📚 Swagger docs available at http://localhost:${PORT}/swagger`);
});