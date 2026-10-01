import * as service from '../services/productivityService.js';
export async function today(req, res) {
  res.json(await service.getToday(req.user));
}
export async function week(req, res) {
  res.json(await service.getWeek(req.user));
}
