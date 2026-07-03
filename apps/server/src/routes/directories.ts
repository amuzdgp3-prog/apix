import { FastifyInstance } from "fastify";
import { registerLocationRoutes } from "./directories/locations.js";
import { registerRouteRoutes } from "./directories/routes.js";
import { registerMachineTypeRoutes } from "./directories/machineTypes.js";
import { registerToyRoutes } from "./directories/toys.js";
import { registerStaffRoutes } from "./directories/staff.js";

export async function registerDirectoryRoutes(fastify: FastifyInstance) {
  await registerLocationRoutes(fastify);
  await registerRouteRoutes(fastify);
  await registerMachineTypeRoutes(fastify);
  await registerToyRoutes(fastify);
  await registerStaffRoutes(fastify);
}