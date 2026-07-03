import type { Express } from "express";
import { registerAdminRoutes } from "./admin-routes";
import { registerAuthRoutes } from "./auth-routes";
import { registerContentRoutes } from "./content-routes";
import { registerCatalogRoutes } from "./catalog-routes";
import { registerCoursesRoutes } from "./courses-routes";
import { registerGradesRoutes } from "./grades-routes";
import { registerLiveRoutes } from "./live-routes";
import { registerMiscRoutes } from "./misc-routes";
import { registerObjectivesRoutes } from "./objectives-routes";
import { registerPaymentsRoutes } from "./payments-routes";
import { registerProfileRoutes } from "./profile-routes";
import { registerQuizRoutes } from "./quiz-routes";
import { registerMessagingRoutes } from "./messaging-routes";
import { registerCharityRoutes } from "./charity-routes";
import { registerCharityAdminRoutes } from "./charity-admin-routes";
import { registerMobileApiRoutes } from "./mobile-api-routes";
import type { RouteContext } from "../server/route-context";

export function registerApiRoutes(app: Express, ctx: RouteContext): void {
  registerCatalogRoutes(app, ctx);
  registerCoursesRoutes(app, ctx);
  registerGradesRoutes(app, ctx);
  registerContentRoutes(app, ctx);
  registerQuizRoutes(app, ctx);
  registerAdminRoutes(app, ctx);
  registerCharityRoutes(app, ctx);
  registerCharityAdminRoutes(app, ctx);
  registerAuthRoutes(app, ctx);
  registerProfileRoutes(app, ctx);
  registerObjectivesRoutes(app, ctx);
  registerLiveRoutes(app, ctx);
  registerPaymentsRoutes(app, ctx);
  registerMiscRoutes(app, ctx);
  registerMessagingRoutes(app, ctx.middleware);
  registerMobileApiRoutes(app, { requireAuth: ctx.middleware.requireAuth });
}
