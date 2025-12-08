<template>
    <div class="structure-visualization-container">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>3D结构可视化</span>
                    <div class="header-actions">
                        <el-button-group>
                            <el-button size="small" @click="resetView"
                                >重置视图</el-button
                            >
                            <el-button size="small" @click="exportImage"
                                >导出图片</el-button
                            >
                        </el-button-group>
                    </div>
                </div>
            </template>

            <div class="visualization-layout">
                <!-- 控制面板 -->
                <div class="control-panel">
                    <el-form
                        :model="visualOptions"
                        label-width="80px"
                        size="small"
                    >
                        <el-form-item label="显示模式">
                            <el-select
                                v-model="visualOptions.displayMode"
                                @change="updateVisualization"
                            >
                                <el-option
                                    label="球棍模型"
                                    value="ball-stick"
                                />
                                <el-option
                                    label="空间填充"
                                    value="space-filling"
                                />
                                <el-option label="线框模型" value="wireframe" />
                            </el-select>
                        </el-form-item>

                        <el-form-item label="原子大小">
                            <el-slider
                                v-model="visualOptions.atomSize"
                                :min="0.5"
                                :max="2"
                                :step="0.1"
                                @change="updateVisualization"
                            />
                        </el-form-item>

                        <el-form-item label="键粗细">
                            <el-slider
                                v-model="visualOptions.bondThickness"
                                :min="0.5"
                                :max="3"
                                :step="0.1"
                                @change="updateVisualization"
                            />
                        </el-form-item>

                        <el-form-item label="旋转速度">
                            <el-slider
                                v-model="visualOptions.rotationSpeed"
                                :min="0"
                                :max="0.02"
                                :step="0.001"
                                @change="updateVisualization"
                            />
                        </el-form-item>

                        <el-form-item label="背景颜色">
                            <el-color-picker
                                v-model="visualOptions.backgroundColor"
                                @change="updateVisualization"
                            />
                        </el-form-item>

                        <el-form-item label="显示元素">
                            <el-checkbox-group
                                v-model="visualOptions.visibleElements"
                                @change="updateVisualization"
                            >
                                <el-checkbox
                                    v-for="element in availableElements"
                                    :key="element"
                                    :label="element"
                                >
                                    {{ element }}
                                </el-checkbox>
                            </el-checkbox-group>
                        </el-form-item>
                    </el-form>
                </div>

                <!-- 3D可视化区域 -->
                <div class="visualization-area">
                    <div
                        ref="visualizationContainer"
                        class="threejs-container"
                        v-loading="loading"
                    />
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from "vue";
import { useAppStore } from "@/stores/app";
import {
    StructureVisualizer,
    type VisualizationOptions,
} from "@/utils/structureVisualizer";
import { CifData } from "@/utils/cifParser";

const appStore = useAppStore();

// 响应式数据
const visualizationContainer = ref<HTMLElement>();
const loading = ref(false);
const visualizer = ref<StructureVisualizer | null>(null);
const availableElements = ref<string[]>([]);

// 可视化选项
const visualOptions = reactive<VisualizationOptions>({
    displayMode: "ball-stick",
    atomSize: 1.0,
    bondThickness: 1.0,
    rotationSpeed: 0.001,
    backgroundColor: "#f0f0f0",
    visibleElements: [],
});

// 加载CIF数据
const loadCifData = async () => {
    try {
        loading.value = true;
        appStore.setStatus("正在加载CIF数据...");

        // 从store获取CIF数据
        const cifData = appStore.getCurrentCifData() as CifData;

        if (!cifData) {
            appStore.setStatus("未找到CIF数据，请先上传并解析CIF文件");
            return;
        }

        // 提取可用元素
        const elements = new Set<string>();
        if (cifData.atoms) {
            cifData.atoms.forEach((atom) => {
                if (atom.element) {
                    elements.add(atom.element);
                }
            });
        }

        availableElements.value = Array.from(elements).sort();
        visualOptions.visibleElements = availableElements.value;

        // 初始化可视化器
        if (visualizationContainer.value && !visualizer.value) {
            visualizer.value = new StructureVisualizer(
                visualizationContainer.value,
                visualOptions,
            );
        }

        // 加载结构
        if (visualizer.value) {
            await visualizer.value.loadStructure(cifData);
            appStore.setStatus(
                `已加载晶体结构：${cifData.atoms?.length || 0}个原子`,
            );
        }
    } catch (error) {
        console.error("加载CIF数据失败:", error);
        appStore.setStatus(
            `加载失败: ${error instanceof Error ? error.message : "未知错误"}`,
        );
    } finally {
        loading.value = false;
    }
};

// 更新可视化
const updateVisualization = () => {
    if (visualizer.value) {
        visualizer.value.updateOptions(visualOptions);
    }
};

// 重置视图
const resetView = () => {
    if (visualizer.value) {
        visualizer.value.resetView();
    }
};

// 导出图片
const exportImage = () => {
    if (visualizer.value) {
        try {
            const dataURL = visualizer.value.exportImage(1920, 1080);
            const link = document.createElement("a");
            link.download = `structure-visualization-${Date.now()}.png`;
            link.href = dataURL;
            link.click();
            appStore.setStatus("图片已导出");
        } catch (error) {
            console.error("导出图片失败:", error);
            appStore.setStatus("导出失败");
        }
    }
};

// 生命周期
onMounted(async () => {
    appStore.setStatus("3D结构可视化模块已加载");

    // 等待DOM更新
    await nextTick();

    // 延迟加载以确保容器已渲染
    setTimeout(() => {
        loadCifData();
    }, 100);
});

onUnmounted(() => {
    if (visualizer.value) {
        visualizer.value.dispose();
        visualizer.value = null;
    }
});
</script>

<style scoped>
.structure-visualization-container {
    max-width: 1600px;
    margin: 0 auto;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.visualization-layout {
    display: flex;
    gap: 20px;
    height: 600px;
}

.control-panel {
    width: 280px;
    flex-shrink: 0;
    overflow-y: auto;
    border-right: 1px solid #e4e7ed;
    padding-right: 20px;
}

.visualization-area {
    flex: 1;
    position: relative;
}

.threejs-container {
    width: 100%;
    height: 100%;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
}

:deep(.el-form-item) {
    margin-bottom: 18px;
}

:deep(.el-checkbox-group) {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
}

@media (max-width: 1200px) {
    .visualization-layout {
        flex-direction: column;
        height: auto;
    }

    .control-panel {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid #e4e7ed;
        padding-right: 0;
        padding-bottom: 20px;
        max-height: 300px;
    }

    .visualization-area {
        height: 500px;
    }
}
</style>
