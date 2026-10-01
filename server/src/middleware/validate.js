export const validate =
  (schema, target = 'body') =>
  (req, _res, next) => {
    req.validated ??= {};
    req.validated[target] = schema.parse(req[target]);
    next();
  };
