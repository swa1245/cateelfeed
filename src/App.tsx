import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import {
  BaggingPage,
  DispatchPage,
  DispatchWeighPage,
  DocumentsPage,
  GateEntryPage,
  GoodsReceiptPage,
  InwardOverviewPage,
  QualityCheckPage,
  WeighbridgePage,
} from "@/pages/InwardOutward";
import {
  BatchHistoryPage,
  ProductionOverviewPage,
  ProductionReportsPage,
  RawMaterialPage,
} from "@/pages/Production";
import { LoginPage } from "@/pages/LoginPage";
import { FinishedFeedQcPage, InProcessQcPage, QcOverviewPage, RawMaterialQcPage, SampleRegisterPage } from "@/pages/QcPages";
import { StoreOverviewPage } from "@/pages/StoreOverview";
import { BreakdownPage, ChecklistPage, PreventivePage, SparesPage } from "@/pages/MaintenancePages";
import { BoilerLogPage, CompressorLogPage, FuelLogPage, PowerLogPage, WaterLogPage } from "@/pages/UtilityPages";
import { InboundOutboundPage, StockMovementsPage, StoreReportsPage } from "@/pages/WarehouseLogs";
import { MaterialDetailsPage } from "@/pages/MaterialDetails";
import { ReadyStockPage } from "@/pages/ReadyStock";
import { DailyPlanPage, FormulationPage, NutrientSpecPage, PlanningOverviewPage } from "@/pages/PlanningPages";
import { NotFoundPage } from "@/pages/NotFoundPage";
import "@/styles/global.css";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="cf-loading">
        <p>Loading workspace…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="inward-outward" element={<InwardOverviewPage />} />
            <Route path="inward-outward/gate-entry" element={<GateEntryPage />} />
            <Route path="inward-outward/weighbridge" element={<WeighbridgePage />} />
            <Route path="inward-outward/quality-check" element={<QualityCheckPage />} />
            <Route path="inward-outward/goods-receipt" element={<GoodsReceiptPage />} />
            <Route path="inward-outward/bagging" element={<BaggingPage />} />
            <Route path="inward-outward/dispatch" element={<DispatchPage />} />
            <Route path="inward-outward/dispatch-weigh" element={<DispatchWeighPage />} />
            <Route path="inward-outward/documents" element={<DocumentsPage />} />
            <Route path="warehouse-store" element={<StoreOverviewPage />} />
            <Route path="warehouse-store/material-details" element={<MaterialDetailsPage />} />
            <Route path="warehouse-store/ready-stock" element={<ReadyStockPage />} />
            <Route path="warehouse-store/inbound-outbound" element={<InboundOutboundPage />} />
            <Route path="warehouse-store/stock-movements" element={<StockMovementsPage />} />
            <Route path="warehouse-store/reports" element={<StoreReportsPage />} />
            <Route path="production" element={<ProductionOverviewPage />} />
            <Route path="production/batch-history" element={<BatchHistoryPage />} />
            <Route path="production/raw-material" element={<RawMaterialPage />} />
            <Route path="production/reports" element={<ProductionReportsPage />} />
            <Route path="production-planning" element={<PlanningOverviewPage />} />
            <Route path="production-planning/plan" element={<DailyPlanPage />} />
            <Route path="production-planning/formulation" element={<FormulationPage />} />
            <Route path="production-planning/nutrients" element={<NutrientSpecPage />} />
            <Route path="qc" element={<QcOverviewPage />} />
            <Route path="qc/raw-material" element={<RawMaterialQcPage />} />
            <Route path="qc/in-process" element={<InProcessQcPage />} />
            <Route path="qc/finished-feed" element={<FinishedFeedQcPage />} />
            <Route path="qc/samples" element={<SampleRegisterPage />} />
            <Route path="utility" element={<Navigate to="/utility/boiler" replace />} />
            <Route path="utility/boiler" element={<BoilerLogPage />} />
            <Route path="utility/power" element={<PowerLogPage />} />
            <Route path="utility/water" element={<WaterLogPage />} />
            <Route path="utility/fuel" element={<FuelLogPage />} />
            <Route path="utility/compressor" element={<CompressorLogPage />} />
            <Route path="maintenance" element={<Navigate to="/maintenance/breakdown" replace />} />
            <Route path="maintenance/breakdown" element={<BreakdownPage />} />
            <Route path="maintenance/preventive" element={<PreventivePage />} />
            <Route path="maintenance/checklist" element={<ChecklistPage />} />
            <Route path="maintenance/spares" element={<SparesPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
