import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeftRight,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Cog,
  Factory,
  FileBarChart,
  FlaskConical,
  Droplets,
  Flame,
  Fuel,
  Gauge,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Package,
  PackageCheck,
  Warehouse,
  Wrench,
  Zap,
} from "lucide-react";

export type NavLinkItem = {
  name: string;
  path: string;
  end?: boolean;
  icon?: LucideIcon;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavLinkItem[];
};

export type NavItem = {
  name: string;
  path: string;
  icon: LucideIcon;
  hint: string;
  groups?: NavGroup[];
  children?: NavLinkItem[];
};

/** CattleFeed sidebar — shown after login. */
export const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    hint: "Plant overview",
  },
  {
    name: "Inward & Outward",
    path: "/inward-outward",
    icon: ArrowLeftRight,
    hint: "Raw material in, finished feed out",
    groups: [
      {
        id: "inward",
        label: "Inward",
        items: [
          { name: "Gate Entry", path: "/inward-outward/gate-entry" },
          { name: "Weighbridge", path: "/inward-outward/weighbridge" },
          { name: "Quality Check", path: "/inward-outward/quality-check" },
          { name: "Goods Receipt", path: "/inward-outward/goods-receipt" },
        ],
      },
      {
        id: "outward",
        label: "Outward",
        items: [
          { name: "Bagging", path: "/inward-outward/bagging" },
          { name: "Dispatch Pick", path: "/inward-outward/dispatch" },
          { name: "Dispatch Weighment", path: "/inward-outward/dispatch-weigh" },
          { name: "Invoice & Gate Pass", path: "/inward-outward/documents" },
        ],
      },
    ],
  },
  {
    name: "Warehouse & Store",
    path: "/warehouse-store",
    icon: Warehouse,
    hint: "Inventory and stock",
    children: [
      { name: "Store Overview", path: "/warehouse-store", end: true, icon: LayoutGrid },
      { name: "Material Details", path: "/warehouse-store/material-details", icon: Package },
      { name: "Production Ready Stock", path: "/warehouse-store/ready-stock", icon: PackageCheck },
      { name: "Inbound / Outbound", path: "/warehouse-store/inbound-outbound", icon: ArrowLeftRight },
      { name: "Stock Movements", path: "/warehouse-store/stock-movements", icon: Activity },
      { name: "Reports", path: "/warehouse-store/reports", icon: FileBarChart },
    ],
  },
  {
    name: "Production",
    path: "/production",
    icon: Factory,
    hint: "Batching, raw material, and reports",
    children: [
      { name: "Production Overview", path: "/production", end: true, icon: LayoutGrid },
      { name: "Batch History", path: "/production/batch-history", icon: Layers },
      { name: "Raw Material", path: "/production/raw-material", icon: Package },
      { name: "Reports", path: "/production/reports", icon: FileBarChart },
    ],
  },
  {
    name: "Production Planning and Formulation",
    path: "/production-planning",
    icon: ClipboardList,
    hint: "Plans and formulations",
    children: [
      { name: "Planning Overview", path: "/production-planning", end: true, icon: LayoutGrid },
      { name: "Daily Plan", path: "/production-planning/plan", icon: CalendarCheck },
      { name: "Formulation", path: "/production-planning/formulation", icon: Layers },
      { name: "Nutrient Targets", path: "/production-planning/nutrients", icon: FlaskConical },
    ],
  },
  {
    name: "QC",
    path: "/qc",
    icon: FlaskConical,
    hint: "Quality control",
    children: [
      { name: "QC Overview", path: "/qc", end: true, icon: LayoutGrid },
      { name: "Raw Material", path: "/qc/raw-material", icon: Package },
      { name: "In-process", path: "/qc/in-process", icon: Activity },
      { name: "Finished Feed", path: "/qc/finished-feed", icon: FileBarChart },
      { name: "Samples", path: "/qc/samples", icon: ClipboardList },
    ],
  },
  {
    name: "Utility",
    path: "/utility",
    icon: Cog,
    hint: "Plant utilities",
    children: [
      { name: "Boiler / Steam", path: "/utility/boiler", icon: Flame },
      { name: "Power", path: "/utility/power", icon: Zap },
      { name: "Water", path: "/utility/water", icon: Droplets },
      { name: "Fuel", path: "/utility/fuel", icon: Fuel },
      { name: "Compressor", path: "/utility/compressor", icon: Gauge },
    ],
  },
  {
    name: "Maintenance",
    path: "/maintenance",
    icon: Wrench,
    hint: "Maintenance logs",
    children: [
      { name: "Breakdown", path: "/maintenance/breakdown", icon: Wrench },
      { name: "Preventive", path: "/maintenance/preventive", icon: CalendarCheck },
      { name: "Checklist", path: "/maintenance/checklist", icon: ClipboardCheck },
      { name: "Spares", path: "/maintenance/spares", icon: Package },
    ],
  },
];
