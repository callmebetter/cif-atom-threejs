<template>
    <div class="cif-database-browser">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>CIF晶体结构数据库</span>
                    <el-button type="primary" @click="showImportDialog = true">
                        <el-icon><Plus /></el-icon>
                        导入CIF文件
                    </el-button>
                </div>
            </template>

            <!-- Search and Filter Section -->
            <el-row :gutter="20" class="search-section">
                <el-col :span="8">
                    <el-input
                        v-model="searchQuery"
                        placeholder="搜索文件名或化学式..."
                        clearable
                        @input="handleSearch"
                    >
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>
                </el-col>

                <el-col :span="10">
                    <el-select
                        v-model="selectedElements"
                        multiple
                        filterable
                        allow-create
                        placeholder="按元素筛选 (例如: C, O, Fe)..."
                        style="width: 100%"
                        @change="handleElementFilter"
                    >
                        <el-option
                            v-for="element in availableElements"
                            :key="element"
                            :label="element"
                            :value="element"
                        />
                    </el-select>
                </el-col>

                <el-col :span="6">
                    <el-select
                        v-model="sortBy"
                        placeholder="排序方式"
                        @change="loadCifRecords"
                    >
                        <el-option
                            label="创建时间 (最新)"
                            value="created_at_DESC"
                        />
                        <el-option
                            label="创建时间 (最旧)"
                            value="created_at_ASC"
                        />
                        <el-option label="文件名 (A-Z)" value="file_name_ASC" />
                        <el-option
                            label="文件名 (Z-A)"
                            value="file_name_DESC"
                        />
                    </el-select>
                </el-col>
            </el-row>

            <!-- CIF Records List -->
            <el-table
                v-loading="loading"
                :data="cifRecords"
                style="width: 100%; margin-top: 20px"
                @row-click="handleRowClick"
            >
                <el-table-column
                    prop="info.file_name"
                    label="文件名"
                    min-width="200"
                >
                    <template #default="{ row }">
                        <el-link
                            type="primary"
                            @click.stop="viewCifDetails(row.info.id)"
                        >
                            {{ row.info.file_name }}
                        </el-link>
                    </template>
                </el-table-column>

                <el-table-column label="化学式" min-width="150">
                    <template #default="{ row }">
                        <span v-if="row.elements.length > 0">
                            {{ formatChemicalFormula(row.elements) }}
                        </span>
                        <span v-else class="text-gray-400">-</span>
                    </template>
                </el-table-column>

                <el-table-column
                    prop="lattice.crystal_system"
                    label="晶系"
                    width="120"
                >
                    <template #default="{ row }">
                        <el-tag
                            v-if="row.lattice?.crystal_system"
                            type="info"
                            size="small"
                        >
                            {{ row.lattice.crystal_system }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column
                    prop="lattice.space_group"
                    label="空间群"
                    width="120"
                >
                    <template #default="{ row }">
                        <span v-if="row.lattice?.space_group">{{
                            row.lattice.space_group
                        }}</span>
                        <span v-else class="text-gray-400">-</span>
                    </template>
                </el-table-column>

                <el-table-column label="原子数" width="80">
                    <template #default="{ row }">
                        {{ row.atom_count }}
                    </template>
                </el-table-column>

                <el-table-column
                    prop="info.created_at"
                    label="创建时间"
                    width="180"
                >
                    <template #default="{ row }">
                        {{ formatDate(row.info.created_at) }}
                    </template>
                </el-table-column>

                <el-table-column label="操作" width="150" fixed="right">
                    <template #default="{ row }">
                        <el-button size="small" @click.stop="analyzeCif(row)">
                            <el-icon><DataAnalysis /></el-icon>
                        </el-button>
                        <el-button
                            size="small"
                            type="danger"
                            @click.stop="deleteCif(row.info.id)"
                        >
                            <el-icon><Delete /></el-icon>
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>

            <!-- Pagination -->
            <div class="pagination-container">
                <el-pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :total="totalCount"
                    :page-sizes="[10, 20, 50, 100]"
                    layout="total, sizes, prev, pager, next, jumper"
                    @size-change="loadCifRecords"
                    @current-change="loadCifRecords"
                />
            </div>
        </el-card>

        <!-- Import CIF Dialog -->
        <el-dialog v-model="showImportDialog" title="导入CIF文件" width="500px">
            <el-upload
                ref="uploadRef"
                :auto-upload="false"
                :show-file-list="true"
                :on-change="handleFileChange"
                :accept="'.cif'"
                drag
            >
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">
                    将CIF文件拖到此处，或<em>点击上传</em>
                </div>
                <template #tip>
                    <div class="el-upload__tip">
                        只能上传.cif文件，且不超过10MB
                    </div>
                </template>
            </el-upload>

            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="showImportDialog = false"
                        >取消</el-button
                    >
                    <el-button
                        type="primary"
                        @click="importCifFiles"
                        :loading="importing"
                    >
                        导入
                    </el-button>
                </span>
            </template>
        </el-dialog>

        <!-- CIF Details Dialog -->
        <el-dialog
            v-model="showDetailsDialog"
            :title="`CIF详情 - ${selectedCif?.info.file_name}`"
            width="80%"
            top="5vh"
        >
            <div v-if="selectedCif" class="cif-details">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="文件名">
                        {{ selectedCif.info.file_name }}
                    </el-descriptions-item>
                    <el-descriptions-item label="文件路径">
                        {{ selectedCif.info.file_path }}
                    </el-descriptions-item>
                    <el-descriptions-item label="解析状态">
                        <el-tag
                            :type="getStatusType(selectedCif.info.parse_status)"
                        >
                            {{ selectedCif.info.parse_status }}
                        </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="创建时间">
                        {{ formatDate(selectedCif.info.created_at) }}
                    </el-descriptions-item>

                    <el-descriptions-item
                        v-if="selectedCif.lattice"
                        label="晶系"
                    >
                        {{ selectedCif.lattice.crystal_system || "-" }}
                    </el-descriptions-item>
                    <el-descriptions-item
                        v-if="selectedCif.lattice"
                        label="空间群"
                    >
                        {{ selectedCif.lattice.space_group || "-" }}
                    </el-descriptions-item>

                    <el-descriptions-item
                        v-if="selectedCif.lattice"
                        label="晶胞参数"
                    >
                        <div v-if="selectedCif.lattice">
                            a={{ selectedCif.lattice.a.toFixed(3) }} Å, b={{
                                selectedCif.lattice.b.toFixed(3)
                            }}
                            Å, c={{ selectedCif.lattice.c.toFixed(3) }} Å
                            <br />
                            α={{ selectedCif.lattice.alpha.toFixed(2) }}°, β={{
                                selectedCif.lattice.beta.toFixed(2)
                            }}°, γ={{ selectedCif.lattice.gamma.toFixed(2) }}°
                        </div>
                    </el-descriptions-item>

                    <el-descriptions-item
                        v-if="selectedCif.lattice?.cell_volume"
                        label="晶胞体积"
                    >
                        {{ selectedCif.lattice.cell_volume.toFixed(3) }} Å³
                    </el-descriptions-item>
                </el-descriptions>

                <!-- Elements Composition -->
                <div v-if="selectedCif.elements.length > 0" class="mt-4">
                    <h3>元素组成</h3>
                    <el-tag
                        v-for="element in selectedCif.elements"
                        :key="element.element_symbol"
                        class="mx-1"
                        type="primary"
                    >
                        {{ element.element_symbol }}: {{ element.count }}
                    </el-tag>
                </div>

                <!-- Structure Visualization -->
                <div v-if="selectedCif.atoms.length > 0" class="mt-4">
                    <h3>3D结构预览</h3>
                    <div ref="viewerContainer" class="viewer-container"></div>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
    Plus,
    Search,
    DataAnalysis,
    Delete,
    UploadFilled,
} from "@element-plus/icons-vue";
import { databaseOperations } from "@/platform/sdk";
import { useRouter } from "vue-router";

const router = useRouter();

// Data
const loading = ref(false);
const importing = ref(false);
const showImportDialog = ref(false);
const showDetailsDialog = ref(false);
const selectedCif = ref(null);
const uploadRef = ref(null);
const viewerContainer = ref(null);

// Search and filter
const searchQuery = ref("");
const selectedElements = ref([]);
const sortBy = ref("created_at_DESC");
const availableElements = ref([]);

// Pagination
const currentPage = ref(1);
const pageSize = ref(20);
const totalCount = ref(0);

// CIF records
const cifRecords = ref([]);
const filesToImport = ref([]);

// Load CIF records with filters
const loadCifRecords = async () => {
    try {
        loading.value = true;

        const [sortField, sortOrder] = sortBy.value.split("_");

        const options = {
            limit: pageSize.value,
            offset: (currentPage.value - 1) * pageSize.value,
            sortBy: sortField,
            sortOrder: sortOrder,
            filterStatus: ["success"],
        };

        // Add element filter if selected
        if (selectedElements.value.length > 0) {
            options.elementFilter = selectedElements.value;
        }

        const result = await databaseOperations.cif.query(options);
console.log(result);
        if (result.success) {
            cifRecords.value = result.data.results;
            totalCount.value = result.data.total;
        } else {
            ElMessage.error(`加载失败: ${result.error}`);
        }
    } catch (error) {
        console.error("加载CIF记录失败:", error);
        ElMessage.error("加载CIF记录时发生错误");
    } finally {
        loading.value = false;
    }
};

// Load available elements from database
const loadAvailableElements = async () => {
    try {
        // This would need a new endpoint to get unique elements
        // For now, use common elements
        availableElements.value = [
            "H",
            "He",
            "Li",
            "Be",
            "B",
            "C",
            "N",
            "O",
            "F",
            "Ne",
            "Na",
            "Mg",
            "Al",
            "Si",
            "P",
            "S",
            "Cl",
            "Ar",
            "K",
            "Ca",
            "Sc",
            "Ti",
            "V",
            "Cr",
            "Mn",
            "Fe",
            "Co",
            "Ni",
            "Cu",
            "Zn",
            "Ga",
            "Ge",
            "As",
            "Se",
            "Br",
            "Kr",
            "Rb",
            "Sr",
            "Y",
            "Zr",
            "Nb",
            "Mo",
            "Tc",
            "Ru",
            "Rh",
            "Pd",
            "Ag",
            "Cd",
            "In",
            "Sn",
            "Sb",
            "Te",
            "I",
            "Xe",
            "Cs",
            "Ba",
            "La",
            "Ce",
            "Pr",
            "Nd",
            "Pm",
            "Sm",
            "Eu",
            "Gd",
            "Tb",
            "Dy",
            "Ho",
            "Er",
            "Tm",
            "Yb",
            "Lu",
            "Hf",
            "Ta",
            "W",
            "Re",
            "Os",
            "Ir",
            "Pt",
            "Au",
            "Hg",
            "Tl",
            "Pb",
            "Bi",
            "Po",
            "At",
            "Rn",
            "Fr",
            "Ra",
            "Ac",
            "Th",
            "Pa",
            "U",
            "Np",
            "Pu",
            "Am",
            "Cm",
            "Bk",
            "Cf",
            "Es",
            "Fm",
        ];
    } catch (error) {
        console.error("加载元素列表失败:", error);
    }
};

// Handle search
const handleSearch = debounce(() => {
    // Implement search by filename
    currentPage.value = 1;
    loadCifRecords();
}, 300);

// Handle element filter
const handleElementFilter = () => {
    currentPage.value = 1;
    loadCifRecords();
};

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle file change in upload
const handleFileChange = (file) => {
    filesToImport.value = [file.raw];
};

// Import CIF files
const importCifFiles = async () => {
    if (filesToImport.value.length === 0) {
        ElMessage.warning("请选择要导入的CIF文件");
        return;
    }

    try {
        importing.value = true;
        let successCount = 0;
        let failCount = 0;

        for (const file of filesToImport.value) {
            try {
                const result = await databaseOperations.cif.save(file.path);
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`导入 ${file.name} 失败:`, result.error);
                }
            } catch (error) {
                failCount++;
                console.error(`导入 ${file.name} 出错:`, error);
            }
        }

        if (successCount > 0) {
            ElMessage.success(`成功导入 ${successCount} 个CIF文件`);
            loadCifRecords();
        }
        if (failCount > 0) {
            ElMessage.warning(`有 ${failCount} 个文件导入失败`);
        }

        showImportDialog.value = false;
        filesToImport.value = [];
        uploadRef.value?.clearFiles();
    } catch (error) {
        ElMessage.error("导入文件时发生错误");
    } finally {
        importing.value = false;
    }
};

// View CIF details
const viewCifDetails = async (id) => {
    try {
        loading.value = true;
        const result = await databaseOperations.cif.getComplete(id);

        if (result.success && result.data) {
            selectedCif.value = result.data;
            showDetailsDialog.value = true;

            // Initialize 3D viewer if needed
            await nextTick();
            if (viewerContainer.value) {
                // TODO: Initialize 3D viewer with CIF data
                console.log("Initialize 3D viewer for CIF:", result.data);
            }
        } else {
            ElMessage.error(`加载CIF详情失败: ${result.error}`);
        }
    } catch (error) {
        console.error("加载CIF详情失败:", error);
        ElMessage.error("加载CIF详情时发生错误");
    } finally {
        loading.value = false;
    }
};

// Handle row click
const handleRowClick = (row) => {
    viewCifDetails(row.info.id);
};

// Analyze CIF in analysis module
const analyzeCif = (row) => {
    // Navigate to CIF analysis with the file
    router.push({
        name: "CifAnalysis",
        query: { file: row.info.file_path },
    });
};

// Delete CIF
const deleteCif = async (id) => {
    try {
        await ElMessageBox.confirm("确定要删除这个CIF记录吗？", "确认删除", {
            confirmButtonText: "删除",
            cancelButtonText: "取消",
            type: "warning",
        });

        const result = await databaseOperations.cif.delete(id);

        if (result.success) {
            ElMessage.success("删除成功");
            loadCifRecords();
        } else {
            ElMessage.error(`删除失败: ${result.error}`);
        }
    } catch (error) {
        if (error !== "cancel") {
            console.error("删除CIF失败:", error);
            ElMessage.error("删除CIF时发生错误");
        }
    }
};

// Format chemical formula
const formatChemicalFormula = (elements) => {
    return elements
        .map((e) => `${e.element_symbol}${e.count > 1 ? e.count : ""}`)
        .join(" ");
};

// Format date
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("zh-CN");
};

// Get status type
const getStatusType = (status) => {
    switch (status) {
        case "success":
            return "success";
        case "failed":
            return "danger";
        case "partial":
            return "warning";
        default:
            return "info";
    }
};

// Load data on mount
onMounted(() => {
    loadCifRecords();
    loadAvailableElements();
});
</script>

<style scoped>
.cif-database-browser {
    padding: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.search-section {
    margin-bottom: 20px;
}

.pagination-container {
    margin-top: 20px;
    text-align: right;
}

.cif-details {
    max-height: 70vh;
    overflow-y: auto;
}

.viewer-container {
    width: 100%;
    height: 400px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background-color: #f5f7fa;
}

.text-gray-400 {
    color: #9ca3af;
}

.mt-4 {
    margin-top: 16px;
}

.mx-1 {
    margin: 0 4px;
}
</style>
