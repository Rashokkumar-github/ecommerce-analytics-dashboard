"use client";

/**
 * Global Chart.js registration — import this ONCE at the top of the page
 * before any chart component is rendered.
 *
 * Registers every controller, element, scale, and plugin used across all
 * charts so that individual components don't race to register their own
 * subsets (which can cause "X is not a registered controller" errors when
 * multiple chart types are mounted on the same page).
 */

import {
  Chart,
  // Controllers
  LineController,
  BarController,
  DoughnutController,
  // Elements
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  // Scales
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  RadialLinearScale,
  // Plugins
  Tooltip,
  Legend,
  Filler,
  Title,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { SankeyController, Flow } from "chartjs-chart-sankey";
import {
  ChoroplethController,
  GeoFeature,
  ColorScale,
  ProjectionScale,
} from "chartjs-chart-geo";

Chart.register(
  // Controllers
  LineController,
  BarController,
  DoughnutController,
  SankeyController,
  ChoroplethController,
  // Elements
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  GeoFeature,
  Flow,
  // Scales
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  RadialLinearScale,
  ColorScale,
  ProjectionScale,
  // Plugins
  Tooltip,
  Legend,
  Filler,
  Title,
  ChartDataLabels,
);

// ChartDataLabels is registered globally but disabled by default.
// Only charts that explicitly set `plugins.datalabels.display: true` will show labels.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Chart.defaults as any).plugins.datalabels = { display: false };
