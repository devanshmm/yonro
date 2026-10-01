import { ZodError } from 'zod';
export function errorHandler(error, req, res, _next) {
  if (error instanceof ZodError)
    return res.status(400).json({
      error: {
        message: 'Please check the highlighted details',
        details: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  if (error.code === 'P2002')
    return res.status(409).json({ error: { message: error.meta?.modelName === 'User' ? 'That email or username is already in use' : 'A record with these unique details already exists' } });
  if (error.code === 'P2034') {
    return res.status(409).json({ error: { message: 'A concurrent update occurred. Please retry.' } });
  }
  if (error.code === 'P2003') {
    return res.status(409).json({ error: { message: 'The related item changed. Refresh and try again.' } });
  }
  if (['P1001', 'P1002', 'P1017'].includes(error.code)) {
    console.error(`[${req.method} ${req.path}] Database unavailable`, error);
    return res.status(503).json({ error: { message: 'The database is temporarily unavailable. Please retry.' } });
  }
  if (error.code === 'P2025')
    return res.status(404).json({ error: { message: 'This item was not found' } });
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ error: { message: 'Invalid JSON body' } });
  if (error.type === 'entity.too.large')
    return res.status(413).json({ error: { message: 'Request body is too large' } });
  if (error.status) return res.status(error.status).json({ error: { message: error.message } });
  console.error(`[${req.method} ${req.path}]`, error);
  res
    .status(500)
    .json({ error: { message: 'Something went wrong on the server. Please try again.' } });
}
