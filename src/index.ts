import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { ResponseHelper } from './utils/response.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging de requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas da API
app.use('/api', routes);

// Rota raiz
app.get('/', (req, res) => {
  ResponseHelper.success(res, {
    name: 'Apollo Backend',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  }, 'Apollo Backend API is running');
});

// Handler para rotas não encontradas
app.use('*', (req, res) => {
  ResponseHelper.error(res, 'Rota não encontrada', 404);
});

// Handler global de erros
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', error);
  ResponseHelper.error(res, 'Erro interno do servidor', 500);
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Apollo Backend rodando na porta ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
});

export default app;
