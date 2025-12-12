import { createRouter, createWebHashHistory } from "vue-router";
import MainLayout from "../views/MainLayout.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: MainLayout,
      redirect: "/upload",
      children: [
        {
          path: "/upload",
          name: "FileUpload",
          component: () => import("@/views/FileUpload.vue"),
        },
        {
          path: "/image-processing",
          name: "ImageProcessing",
          component: () => import("@/views/ImageProcessing.vue"),
        },
        {
          path: "/cif-analysis",
          name: "CifAnalysis",
          component: () => import("@/views/CifAnalysis.vue"),
        },
        {
          path: "/structure-visualization",
          name: "StructureVisualization",
          component: () => import("@/views/StructureVisualization.vue"),
        },
        {
          path: "/component-analysis",
          name: "ComponentAnalysis",
          component: () => import("@/views/ComponentAnalysis.vue"),
        },
        {
          path: "/image-mesh",
          name: "ImageMesh",
          component: () => import("@/views/ImageMesh.vue"),
        },
        {
          path: "/report-generator",
          name: "ReportGenerator",
          component: () => import("@/views/ReportGenerator.vue"),
        },
        {
          path: "/cif-database",
          name: "CifDatabase",
          component: () => import("@/views/CifDatabaseBrowser.vue"),
        },
        {
          path: "/file-content/:id",
          name: "FileContent",
          component: () => import("@/views/FileContentView.vue"),
        },
        {
          path: "/settings",
          name: "Settings",
          component: () => import("@/views/SettingsPage.vue"),
        },
      ],
    },
  ],
});

export default router;
