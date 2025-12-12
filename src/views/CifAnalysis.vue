<template>
    <div class="cif-analysis-container">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>CIF解析与材料分析</span>
                    <div>
                        <el-button
                            type="success"
                            @click="analyzeMaterial"
                            :disabled="!cifAtoms.length"
                        >
                            <el-icon><DataAnalysis /></el-icon>
                            材料分析
                        </el-button>
                        <el-button
                            type="primary"
                            @click="parseCif"
                            :disabled="!currentFile"
                            v-show="!hasParsed"
                        >
                            <el-icon><Document /></el-icon>
                            解析CIF
                        </el-button>
                    </div>
                </div>
            </template>

            <div v-if="!currentFile" class="no-file-selected">
                <el-empty description="请先选择一个CIF文件">
                    <el-button type="primary" @click="$router.push('/upload')">
                        去上传文件
                    </el-button>
                </el-empty>
            </div>

            <div v-else class="cif-workspace">
                <!-- 材料分析结果 -->
                <el-tabs v-model="activeTab" v-if="analysisResult">
                    <el-tab-pane label="晶体结构分析" name="structure">
                        <CrystalStructureAnalysis
                            v-if="crystalStructureAnalysisData"
                            :analysis-result="crystalStructureAnalysisData"
                        />
                    </el-tab-pane>

                    <el-tab-pane label="组成分析" name="composition">
                        <CompositionAnalysis
                            v-if="compositionAnalysisData"
                            :analysis-result="compositionAnalysisData"
                            :material-analyzer="materialAnalyzer"
                        />
                    </el-tab-pane>

                    <el-tab-pane
                        label="相分析"
                        name="phase"
                        v-if="phaseAnalysisResult"
                    >
                        <PhaseAnalysis
                            v-if="phaseAnalysisData"
                            :phase-analysis-result="phaseAnalysisData"
                        />
                    </el-tab-pane>
                </el-tabs>

                <!-- 原始CIF信息 -->
                <el-tabs v-model="activeTab" v-else>
                    <el-tab-pane label="晶体结构信息" name="structure">
                        <CifInfoPanel
                            :current-file="currentFile"
                            :cif-data="transformedCifData"
                        />
                    </el-tab-pane>

                    <el-tab-pane label="原子位置" name="atoms">
                        <AtomicPositions :cif-data="transformedCifData" />
                    </el-tab-pane>

                    <el-tab-pane label="信息" name="info">
                        <CifBasicInfo :cif-data="transformedCifData" />
                    </el-tab-pane>
                </el-tabs>

                <div class="action-buttons">
                    <el-button @click="visualizeStructure">
                        <el-icon><View /></el-icon>
                        3D可视化
                    </el-button>
                    <el-button
                        type="success"
                        @click="saveToDatabase"
                        :disabled="!analysisResult"
                    >
                        <el-icon><FolderAdd /></el-icon>
                        保存到数据库
                    </el-button>
                    <el-button
                        type="primary"
                        @click="saveCifToDatabase"
                        :disabled="!hasParsed"
                    >
                        <el-icon><FolderOpened /></el-icon>
                        保存CIF结构
                    </el-button>
                    <el-button type="primary" @click="saveAnalysis">
                        <el-icon><Download /></el-icon>
                        导出分析结果
                    </el-button>
                </div>

                <!-- 解析警告 -->
                <div
                    v-if="
                        cifData.metadata &&
                        cifData.metadata.warnings &&
                        cifData.metadata.warnings.length > 0
                    "
                    class="warnings"
                >
                    <el-alert
                        title="解析警告"
                        type="warning"
                        :closable="false"
                        show-icon
                    >
                        <ul>
                            <li
                                v-for="warning in cifData.metadata.warnings"
                                :key="warning"
                            >
                                {{ warning }}
                            </li>
                        </ul>
                    </el-alert>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive, computed } from "vue";
import { useAppStore } from "@/stores/app";
import { useRouter } from "vue-router";
import { ElMessage, ElLoading } from "element-plus";
import { CifParser, type CifData } from "@/utils/cifParser";
import {
    materialAnalyzer,
    type AnalysisResult,
} from "@/utils/materialAnalyzer";
import { fileOperations, databaseOperations } from "@/platform/sdk";

// Import components
import CifInfoPanel from "@/components/cif/CifInfoPanel.vue";
import AtomicPositions from "@/components/cif/AtomicPositions.vue";
import CrystalStructureAnalysis from "@/components/cif/CrystalStructureAnalysis.vue";
import CompositionAnalysis from "@/components/cif/CompositionAnalysis.vue";
import PhaseAnalysis from "@/components/cif/PhaseAnalysis.vue";
import CifBasicInfo from "@/components/cif/CifBasicInfo.vue";

const appStore = useAppStore();
const router = useRouter();

const cifData = reactive<CifData>({
    atoms: [],
    block_id: "",
    cell_parameters: undefined,
    chemical_formula_moiety: "",
    chemical_formula_sum: "",
    chemical_name: "",
    crystal_system: "",
    filename: "",
    metadata: {
        parse_date: new Date().toISOString(),
        parser_version: "1.0.0",
        warnings: [],
    },
    symmetry: [],
    title: "",
    _raw: undefined,
});

// Computed properties to transform data to match component expectations
const transformedCifData = computed(() => {
    return {
        chemical_formula_sum: cifData.chemical_formula_sum,
        chemical_formula_moiety: cifData.chemical_formula_moiety,
        chemical_name: cifData.chemical_name,
        crystal_system: cifData.crystal_system,
        symmetry: cifData.symmetry,
        cell_parameters: cifData.cell_parameters
            ? {
                  a: cifData.cell_parameters.a ?? 0,
                  b: cifData.cell_parameters.b ?? 0,
                  c: cifData.cell_parameters.c ?? 0,
                  alpha: cifData.cell_parameters.alpha ?? 0,
                  beta: cifData.cell_parameters.beta ?? 0,
                  gamma: cifData.cell_parameters.gamma ?? 0,
                  volume: cifData.cell_parameters.volume ?? 0,
              }
            : undefined,
        atoms: cifData.atoms.map((atom) => ({
            label: atom.label ?? "",
            element: atom.element,
            x: atom.x ?? 0,
            y: atom.y ?? 0,
            z: atom.z ?? 0,
            occupancy: atom.occupancy ?? 0,
            thermal_factor: atom.thermal_factor ?? 0,
        })),
    };
});

// Transform AnalysisResult to match CrystalStructureAnalysis component expectations
const crystalStructureAnalysisData = computed(() => {
    if (
        !analysisResult.value ||
        !analysisResult.value.success ||
        !analysisResult.value.data
    ) {
        return null;
    }

    // Type assertion to match the expected component interface
    return {
        data: analysisResult.value.data,
    } as {
        data: {
            cellVolume: number;
            density: number;
            formula: string;
            symmetry: {
                crystalSystem: string;
                spaceGroup: string;
                pointGroup: string;
            };
            bondLengths: Array<{
                element1: string;
                element2: string;
                length: number;
                count: number;
            }>;
            angles: Array<{
                element1: string;
                element2: string;
                element3: string;
                angle: number;
                count: number;
            }>;
            composition: Map<string, number>;
        };
    };
});

// Transform AnalysisResult to match CompositionAnalysis component expectations
const compositionAnalysisData = computed(() => {
    if (
        !analysisResult.value ||
        !analysisResult.value.success ||
        !analysisResult.value.data
    ) {
        return null;
    }

    // Type assertion to match the expected component interface
    return {
        data: analysisResult.value.data,
    } as {
        data: {
            composition: Map<string, number>;
        };
    };
});

// Transform AnalysisResult to match PhaseAnalysis component expectations
const phaseAnalysisData = computed(() => {
    if (
        !phaseAnalysisResult.value ||
        !phaseAnalysisResult.value.success ||
        !phaseAnalysisResult.value.data
    ) {
        return null;
    }

    // Type assertion to match the expected component interface
    return {
        data: phaseAnalysisResult.value.data,
    } as {
        data: {
            stability: {
                temperature: number;
                pressure: number;
                gibbsEnergy: number;
            };
            phases: Array<{
                name: string;
                fraction: number;
                spaceGroup: string;
            }>;
        };
    };
});

const cifAtoms = computed(() => {
    // Fixed: Ensure we return an array even if cifData.atoms is undefined
    return cifData.atoms && Array.isArray(cifData.atoms) ? cifData.atoms : [];
});

const currentFile = ref(appStore.currentFile);
const analysisResult = ref<AnalysisResult | null>(null);
const phaseAnalysisResult = ref<AnalysisResult | null>(null);
const activeTab = ref("info");
const hasParsed = ref(false);
const loading = ref<ReturnType<typeof ElLoading.service> | null>(null);

const parseCif = async () => {
    if (!currentFile.value) return;

    try {
        loading.value = ElLoading.service({
            text: "正在解析CIF文件...",
            background: "rgba(0, 0, 0, 0.7)",
            fullscreen: true,
            lock: true,
            spinner: "el-icon-loading",
        });

        const result = await fileOperations.readFile(currentFile.value.path);
        if (result.success && result.data) {
            const cifText = new TextDecoder().decode(result.data);

            // 解析CIF内容
            const parsed = CifParser.parseAll(cifText)[0];
            console.log(parsed);

            // Fixed: Properly update reactive object instead of using Object.assign
            Object.keys(parsed).forEach((key) => {
                // @ts-ignore
                cifData[key] = parsed[key];
            });

            appStore.updateFileStatus(currentFile.value.id, true);
            appStore.setCifData(parsed);

            // 显示解析信息
            const message = `解析成功: ${parsed.atoms.length} 个原子`;
            // Fixed: Properly check for metadata and warnings
            if (
                parsed.metadata &&
                parsed.metadata.warnings &&
                parsed.metadata.warnings.length > 0
            ) {
                ElMessage.warning(
                    `${message} (${parsed.metadata.warnings.length} 个警告)`,
                );
            } else {
                ElMessage.success(message);
            }
            hasParsed.value = true;
        }
    } catch (error) {
        ElMessage.error("CIF文件解析失败: " + error);
    } finally {
        loading.value?.close();
    }
};

const analyzeMaterial = () => {
    if (!cifData.atoms.length) {
        ElMessage.warning("请先解析CIF文件");
        return;
    }

    try {
        // 晶体结构分析
        const crystalResult = materialAnalyzer.analyzeCrystalStructure(cifData);
        analysisResult.value = crystalResult;
        console.log(`analysisResult.value, `, analysisResult.value);

        // 相分析
        const phaseResult = materialAnalyzer.analyzePhases(cifData);
        phaseAnalysisResult.value = phaseResult;
        console.log(`phaseAnalysisResult.value, `, phaseAnalysisResult.value);

        // Fixed: Added proper checks before accessing properties
        if (crystalResult.success && phaseResult.success) {
            ElMessage.success("材料分析完成");
            activeTab.value = "structure";
        } else {
            ElMessage.error("材料分析失败");
        }
    } catch (error) {
        ElMessage.error("材料分析失败: " + error);
    }
};

const visualizeStructure = () => {
    if (cifData.atoms.length > 0) {
        router.push("/structure-visualization");
    } else {
        ElMessage.warning("请先解析CIF文件");
    }
};

const saveToDatabase = async () => {
    if (!analysisResult.value || !currentFile.value) return;

    try {
        // Try to find existing project with the same name
        let projectName = currentFile.value.name.replace(".cif", "");
        let project = appStore.projects.find((p) => p.name === projectName);

        // If project doesn't exist, create it
        if (!project) {
            try {
                project = await appStore.createProject({
                    name: projectName,
                    description: `晶体结构分析项目 - ${currentFile.value.name}`,
                    cif_file_path: currentFile.value.path,
                });
            } catch (createError) {
                // Handle the case where project already exists despite our check
                if (
                    createError instanceof Error &&
                    createError.message.includes("UNIQUE constraint failed")
                ) {
                    // Try to find the project again
                    await appStore.loadProjects(); // Refresh project list
                    project = appStore.projects.find(
                        (p) => p.name === projectName,
                    );

                    if (!project) {
                        ElMessage.error("保存到数据库失败: 项目名称已存在");
                        return;
                    }
                } else {
                    throw createError;
                }
            }
        }

        // Check if project creation/fetch was successful
        if (!project || !project.id) {
            ElMessage.error("保存到数据库失败: 无法创建或找到项目");
            return;
        }

        // Create analysis record
        const analysisRecord = await appStore.createAnalysisRecord({
            project_id: project.id,
            analysis_type: "crystal_structure",
            parameters: JSON.stringify({
                // Fixed: Properly access data properties with type checking
                cellVolume:
                    analysisResult.value.data &&
                    typeof analysisResult.value.data === "object" &&
                    "cellVolume" in analysisResult.value.data
                        ? (analysisResult.value.data as any).cellVolume
                        : undefined,
                density:
                    analysisResult.value.data &&
                    typeof analysisResult.value.data === "object" &&
                    "density" in analysisResult.value.data
                        ? (analysisResult.value.data as any).density
                        : undefined,
                formula:
                    analysisResult.value.data &&
                    typeof analysisResult.value.data === "object" &&
                    "formula" in analysisResult.value.data
                        ? (analysisResult.value.data as any).formula
                        : undefined,
            }),
            status: "completed",
        });

        // Check if analysis record creation was successful
        // Fixed: Using correct property checking for analysis record
        if (!analysisRecord || !("id" in analysisRecord)) {
            ElMessage.error("保存到数据库失败: 无法创建分析记录");
            return;
        }

        ElMessage.success("分析结果已保存到数据库");
    } catch (error) {
        ElMessage.error(
            "保存到数据库失败: " +
                (error instanceof Error ? error.message : String(error)),
        );
    }
};

const saveAnalysis = async () => {
    if (!currentFile.value) return;

    try {
        const analysisData = {
            fileName: currentFile.value.name,
            timestamp: new Date().toISOString(),
            cifData: cifData,
            analysisResult: analysisResult.value,
            phaseAnalysisResult: phaseAnalysisResult.value,
        };

        const fileName = `analysis_${currentFile.value.name.replace(".cif", ".json")}`;
        // Fixed: Correctly convert string to ArrayBuffer
        const dataString = JSON.stringify(analysisData, null, 2);
        const buffer = new ArrayBuffer(dataString.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < dataString.length; i++) {
            view[i] = dataString.charCodeAt(i);
        }

        const result = await fileOperations.saveFile(fileName, buffer);

        if (result.success) {
            ElMessage.success("分析结果导出成功");
        } else {
            ElMessage.error("分析结果导出失败: " + result.error);
        }
    } catch (error) {
        ElMessage.error("分析结果导出失败: " + error);
    }
};

const saveCifToDatabase = async () => {
    if (!currentFile.value || !cifData.value) {
        ElMessage.warning("没有可保存的CIF数据");
        return;
    }

    try {
        loading.value = true;

        // Save using the new CIF storage system
        const result = await databaseOperations.cif.save(
            currentFile.value.path,
        );

        if (result.success) {
            ElMessage.success(`CIF结构已保存到数据库 (ID: ${result.recordId})`);

            // Store the record ID for possible future use
            cifData.value._raw = cifData.value._raw || {};
            cifData.value._raw.databaseId = result.recordId;
        } else {
            ElMessage.error(`保存失败: ${result.error}`);
        }
    } catch (error) {
        console.error("保存CIF到数据库失败:", error);
        ElMessage.error("保存CIF到数据库时发生错误");
    } finally {
        loading.value = false;
    }
};

watch(
    () => appStore.currentFile,
    (newFile) => {
        currentFile.value = newFile;
        if (newFile && newFile.type === "cif") {
            parseCif();
        }
    },
);

onMounted(() => {
    appStore.setStatus("CIF解析与材料分析模块已就绪");
    if (currentFile.value && currentFile.value.type === "cif") {
        parseCif();
    }
});
</script>

<style scoped>
.cif-analysis-container {
    max-width: 1400px;
    margin: 0 auto;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-header > div {
    display: flex;
    gap: 10px;
}

.no-file-selected {
    text-align: center;
    padding: 40px;
}

.cif-workspace {
    min-height: 600px;
}

.warnings {
    margin-top: 20px;
}

.warnings ul {
    margin: 0;
    padding-left: 20px;
}

.warnings li {
    margin-bottom: 5px;
}

:deep(.el-tabs__content) {
    padding-top: 20px;
}

.action-buttons {
    margin-top: 20px;
    text-align: center;
}

.action-buttons .el-button {
    margin: 0 10px;
}
</style>
