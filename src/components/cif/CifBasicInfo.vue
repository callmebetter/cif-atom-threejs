<template>
    <el-card class="cif-info-card">
        <template #header>
            <div class="card-header-title">CIF文件基础信息</div>
        </template>
        <el-descriptions :column="1" border :label-width="150">
            <el-descriptions-item label="标题">{{
                cifData.title || "未设置"
            }}</el-descriptions-item>
            <el-descriptions-item label="文件名">{{
                cifData.filename || "未设置"
            }}</el-descriptions-item>
            <el-descriptions-item label="块ID">{{
                cifData.block_id || "未设置"
            }}</el-descriptions-item>
            <el-descriptions-item label="化学名称">{{
                cifData.chemical_name || "未设置"
            }}</el-descriptions-item>
            <el-descriptions-item label="化学分子式(总和)">{{
                cifData.chemical_formula_sum || "未设置"
            }}</el-descriptions-item>
            <el-descriptions-item label="化学分子式(部分)">{{
                cifData.chemical_formula_moiety || "未设置"
            }}</el-descriptions-item>
            <el-descriptions-item label="晶系">{{
                cifData.crystal_system || "未设置"
            }}</el-descriptions-item>
            <el-descriptions-item label="解析日期">{{
                new Date(cifData.metadata?.parse_date || "").toLocaleString()
            }}</el-descriptions-item>
            <el-descriptions-item label="解析器版本">{{
                cifData.metadata?.parser_version || "未设置"
            }}</el-descriptions-item>
            <el-descriptions-item label="解析警告数量">{{
                cifData.metadata?.warnings?.length || 0
            }}</el-descriptions-item>
            <el-descriptions-item label="原子数量">{{
                cifData.atoms.length
            }}</el-descriptions-item>
            <el-descriptions-item label="原始数据大小" v-if="cifData._raw">
                {{ fileSize }} 字节
            </el-descriptions-item>
            <!-- raw content -->
            <el-descriptions-item label="原始数据内容" v-if="cifData._raw">
                <code> {{ cifData._raw }}</code>
            </el-descriptions-item>
        </el-descriptions>

        <!-- 解析警告详情 -->
        <!-- <div
            class="warnings-section"
            v-if="cifData.metadata?.warnings?.length > 0"
        >
            <h4>解析警告</h4>
            <el-alert
                v-for="(warning, index) in cifData.metadata.warnings"
                :key="index"
                :title="`警告 ${index + 1}`"
                :description="warning"
                type="warning"
                show-icon
                :closable="false"
                style="margin-bottom: 10px"
            />
        </div> -->
    </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ElDescriptions, ElDescriptionsItem } from "element-plus";
import { type CifData } from "@/utils/cifParser";

interface Props {
    cifData: CifData;
}

const props = defineProps<Props>();

const fileSize = computed(() => {
    if (!props.cifData._raw) return 0;
    return new Blob([JSON.stringify(props.cifData._raw)]).size;
});
</script>

<style scoped>
.cif-info-card {
    margin-bottom: 20px;
}

.card-header-title {
    font-weight: bold;
    font-size: 16px;
}

.warnings-section {
    margin-top: 20px;
}

.warnings-section h4 {
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: bold;
}
</style>
