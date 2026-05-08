<template>
  <div class="max-w-md mx-auto min-h-screen bg-gray-50 pb-8">
    <!-- Header -->
    <header class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 sticky top-0 z-10 shadow-md">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-bold">自选基金估值</h1>
        <span class="text-xs text-blue-200">{{ updateTime }}</span>
      </div>
    </header>

    <!-- Add Fund Section -->
    <div class="px-4 py-3 bg-white shadow-sm">
      <div class="flex gap-2">
        <input
          v-model="newCode"
          type="text"
          placeholder="输入6位基金代码"
          maxlength="6"
          pattern="[0-9]{6}"
          inputmode="numeric"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          @keyup.enter="addFund"
        />
        <button
          @click="addFund"
          :disabled="adding"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 active:bg-blue-700"
        >
          {{ adding ? '...' : '添加' }}
        </button>
      </div>
      <p v-if="error" class="text-red-500 text-xs mt-2">{{ error }}</p>
    </div>

    <!-- Fund List -->
    <div class="px-4 mt-2 space-y-2">
      <div
        v-for="fund in fundData"
        :key="fund.fundcode"
        class="bg-white rounded-xl p-3 shadow-sm"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="font-semibold text-gray-900 truncate">{{ fund.name }}</span>
              <span class="text-xs text-gray-500">{{ fund.fundcode }}</span>
            </div>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="text-xl font-bold" :class="getColorClass(fund.gszzl)">
                {{ formatPercent(fund.gszzl) }}
              </span>
              <span class="text-sm" :class="getColorClass(fund.gszzl)">
                {{ fund.gsz }}
              </span>
            </div>
            <div class="text-xs text-gray-400 mt-1">
              估值时间: {{ fund.gztime }}
            </div>
          </div>
          <button
            @click="removeFund(fund.fundcode)"
            class="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="fundData.length === 0 && !loading" class="text-center py-8 text-gray-400">
        <p>暂无自选基金</p>
        <p class="text-xs mt-1">输入基金代码添加</p>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="text-center py-4 text-gray-400 text-sm">
      正在加载...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getFundCodes, addFundCode, removeFundCode } from './services/storage'
import { fetchFundValuation, fetchAllValuations, type FundValuation } from './services/api'

const newCode = ref('')
const error = ref('')
const adding = ref(false)
const loading = ref(false)
const fundData = ref<FundValuation[]>([])
const updateTime = ref('')

let refreshTimer: ReturnType<typeof setInterval> | null = null

function formatPercent(val: string): string {
  const num = parseFloat(val)
  if (isNaN(num)) return val
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`
}

function getColorClass(val: string): string {
  const num = parseFloat(val)
  if (num > 0) return 'text-red-500'
  if (num < 0) return 'text-green-500'
  return 'text-gray-500'
}

async function loadFunds() {
  const codes = getFundCodes()
  if (codes.length === 0) {
    fundData.value = []
    return
  }

  loading.value = true
  try {
    const results = await fetchAllValuations(codes)
    fundData.value = codes
      .map(code => results.get(code))
      .filter((f): f is FundValuation => f !== undefined)
    if (fundData.value.length > 0) {
      updateTime.value = fundData.value[0].gztime
    }
  } catch (e) {
    console.error('Failed to load funds:', e)
  } finally {
    loading.value = false
  }
}

async function addFund() {
  const code = newCode.value.trim()
  if (!/^[0-9]{6}$/.test(code)) {
    error.value = '请输入6位数字基金代码'
    return
  }

  const codes = getFundCodes()
  if (codes.includes(code)) {
    error.value = '该基金已在自选列表中'
    return
  }

  adding.value = true
  error.value = ''
  try {
    // Validate the fund code by fetching its data
    await fetchFundValuation(code)
    addFundCode(code)
    newCode.value = ''
    await loadFunds()
  } catch {
    error.value = '无效的基金代码，请检查后重试'
  } finally {
    adding.value = false
  }
}

function removeFund(code: string) {
  removeFundCode(code)
  loadFunds()
}

function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    loadFunds()
  }, 60000) // 60 seconds
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  loadFunds()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>
