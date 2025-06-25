import { describe, it, expect, beforeEach } from "vitest"

// Mock contract state
let forecastingState = {
  cashFlows: new Map(),
  forecasts: new Map(),
  forecastAccuracy: 0,
  lastForecastBlock: 0,
}

// Mock treasury manager contract
const mockTreasuryManager = {
  hasPermission: (address, permission) => {
    // Mock authorized manager for cash forecasting (permission 1)
    const authorizedManagers = ["ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"]
    return authorizedManagers.includes(address) && permission === 1
  },
}

// Mock cash forecasting contract
const mockForecastingContract = {
  recordCashFlow: (period, inflow, outflow) => {
    if (!mockTreasuryManager.hasPermission("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 1)) {
      return { error: "unauthorized" }
    }
    
    if (inflow <= 0 || period <= 0) {
      return { error: "invalid-amount" }
    }
    
    const netFlow = inflow >= outflow ? inflow - outflow : outflow - inflow
    
    forecastingState.cashFlows.set(period, {
      inflow,
      outflow,
      netFlow,
      period,
    })
    
    return { success: true, data: period }
  },
  
  generateForecast: (futurePeriod) => {
    if (!mockTreasuryManager.hasPermission("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 1)) {
      return { error: "unauthorized" }
    }
    
    if (futurePeriod <= forecastingState.lastForecastBlock) {
      return { error: "invalid-period" }
    }
    
    // Simple forecasting logic
    const historicalAvg = 1000
    const trendFactor = 5
    const predictedInflow = Math.floor((historicalAvg * (100 + trendFactor)) / 100)
    const predictedOutflow = Math.floor((historicalAvg * 95) / 100)
    const confidence = 75
    
    forecastingState.forecasts.set(futurePeriod, {
      predictedInflow,
      predictedOutflow,
      predictedNet: predictedInflow - predictedOutflow,
      confidence,
      createdAt: Date.now(),
    })
    
    forecastingState.lastForecastBlock = futurePeriod
    return { success: true, data: futurePeriod }
  },
  
  updateAccuracy: (period) => {
    if (!mockTreasuryManager.hasPermission("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 1)) {
      return { error: "unauthorized" }
    }
    
    const forecast = forecastingState.forecasts.get(period)
    const actual = forecastingState.cashFlows.get(period)
    
    if (!forecast || !actual) {
      return { error: "invalid-period" }
    }
    
    const accuracyScore = calculateAccuracyScore(forecast.predictedNet, actual.netFlow)
    forecastingState.forecastAccuracy = accuracyScore
    
    return { success: true, data: accuracyScore }
  },
  
  getCashFlow: (period) => {
    return forecastingState.cashFlows.get(period) || null
  },
  
  getForecast: (period) => {
    return forecastingState.forecasts.get(period) || null
  },
  
  getForecastAccuracy: () => {
    return forecastingState.forecastAccuracy
  },
  
  getLiquidityRequirements: (period) => {
    const forecast = forecastingState.forecasts.get(period)
    if (!forecast) return null
    
    return {
      minimumRequired: forecast.predictedOutflow,
      recommended: Math.floor(forecast.predictedOutflow * 1.1), // 10% buffer
      confidence: forecast.confidence,
    }
  },
}

function calculateAccuracyScore(predicted, actual) {
  if (predicted === actual) return 100
  
  if (predicted > actual) {
    return Math.floor(((predicted - actual) * 100) / predicted)
  } else {
    return Math.floor(((actual - predicted) * 100) / actual)
  }
}

describe("Cash Forecasting Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    forecastingState = {
      cashFlows: new Map(),
      forecasts: new Map(),
      forecastAccuracy: 0,
      lastForecastBlock: 0,
    }
  })
  
  describe("Cash Flow Recording", () => {
    it("should record cash flow data successfully", () => {
      const period = 1
      const inflow = 5000
      const outflow = 3000
      
      const result = mockForecastingContract.recordCashFlow(period, inflow, outflow)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(period)
      
      const recorded = mockForecastingContract.getCashFlow(period)
      expect(recorded).toBeDefined()
      expect(recorded.inflow).toBe(inflow)
      expect(recorded.outflow).toBe(outflow)
      expect(recorded.netFlow).toBe(inflow - outflow)
    })
    
    it("should reject invalid cash flow amounts", () => {
      const period = 1
      const inflow = 0 // Invalid
      const outflow = 3000
      
      const result = mockForecastingContract.recordCashFlow(period, inflow, outflow)
      
      expect(result.error).toBe("invalid-amount")
    })
    
    it("should reject invalid period", () => {
      const period = 0 // Invalid
      const inflow = 5000
      const outflow = 3000
      
      const result = mockForecastingContract.recordCashFlow(period, inflow, outflow)
      
      expect(result.error).toBe("invalid-amount")
    })
    
    it("should calculate net flow correctly for different scenarios", () => {
      // Positive net flow
      mockForecastingContract.recordCashFlow(1, 5000, 3000)
      let cashFlow = mockForecastingContract.getCashFlow(1)
      expect(cashFlow.netFlow).toBe(2000)
      
      // Negative net flow
      mockForecastingContract.recordCashFlow(2, 2000, 4000)
      cashFlow = mockForecastingContract.getCashFlow(2)
      expect(cashFlow.netFlow).toBe(2000) // Absolute difference
      
      // Equal inflow and outflow
      mockForecastingContract.recordCashFlow(3, 3000, 3000)
      cashFlow = mockForecastingContract.getCashFlow(3)
      expect(cashFlow.netFlow).toBe(0)
    })
  })
  
  describe("Forecast Generation", () => {
    it("should generate forecast successfully", () => {
      const futurePeriod = 10
      
      const result = mockForecastingContract.generateForecast(futurePeriod)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(futurePeriod)
      
      const forecast = mockForecastingContract.getForecast(futurePeriod)
      expect(forecast).toBeDefined()
      expect(forecast.predictedInflow).toBe(1050) // 1000 * 1.05
      expect(forecast.predictedOutflow).toBe(950) // 1000 * 0.95
      expect(forecast.predictedNet).toBe(100) // 1050 - 950
      expect(forecast.confidence).toBe(75)
    })
    
    it("should reject forecast for past periods", () => {
      // Generate initial forecast
      mockForecastingContract.generateForecast(10)
      
      // Try to generate forecast for earlier period
      const result = mockForecastingContract.generateForecast(5)
      
      expect(result.error).toBe("invalid-period")
    })
    
    it("should update last forecast block", () => {
      const futurePeriod1 = 10
      const futurePeriod2 = 20
      
      mockForecastingContract.generateForecast(futurePeriod1)
      expect(forecastingState.lastForecastBlock).toBe(futurePeriod1)
      
      mockForecastingContract.generateForecast(futurePeriod2)
      expect(forecastingState.lastForecastBlock).toBe(futurePeriod2)
    })
  })
  
  describe("Accuracy Tracking", () => {
    it("should calculate perfect accuracy score", () => {
      const period = 1
      
      // Record actual data
      mockForecastingContract.recordCashFlow(period, 1050, 950)
      
      // Generate forecast with same values
      forecastingState.forecasts.set(period, {
        predictedInflow: 1050,
        predictedOutflow: 950,
        predictedNet: 100,
        confidence: 75,
        createdAt: Date.now(),
      })
      
      const result = mockForecastingContract.updateAccuracy(period)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(100) // Perfect accuracy
      expect(mockForecastingContract.getForecastAccuracy()).toBe(100)
    })
    
    it("should calculate accuracy score for different scenarios", () => {
      const period = 1
      
      // Record actual data with higher net flow than predicted
      mockForecastingContract.recordCashFlow(period, 1200, 800) // Net: 400
      
      // Set forecast with lower net flow
      forecastingState.forecasts.set(period, {
        predictedInflow: 1050,
        predictedOutflow: 950,
        predictedNet: 100,
        confidence: 75,
        createdAt: Date.now(),
      })
      
      const result = mockForecastingContract.updateAccuracy(period)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(75) // (400-100)*100/400 = 75
    })
    
    it("should handle missing forecast or actual data", () => {
      const period = 1
      
      // Try to update accuracy without forecast data
      const result = mockForecastingContract.updateAccuracy(period)
      
      expect(result.error).toBe("invalid-period")
    })
  })
  
  describe("Liquidity Requirements", () => {
    it("should calculate liquidity requirements with buffer", () => {
      const period = 1
      const predictedOutflow = 1000
      
      forecastingState.forecasts.set(period, {
        predictedInflow: 1200,
        predictedOutflow: predictedOutflow,
        predictedNet: 200,
        confidence: 80,
        createdAt: Date.now(),
      })
      
      const requirements = mockForecastingContract.getLiquidityRequirements(period)
      
      expect(requirements).toBeDefined()
      expect(requirements.minimumRequired).toBe(predictedOutflow)
      expect(requirements.recommended).toBe(1100) // 10% buffer
      expect(requirements.confidence).toBe(80)
    })
    
    it("should return null for non-existent forecast", () => {
      const requirements = mockForecastingContract.getLiquidityRequirements(999)
      
      expect(requirements).toBeNull()
    })
  })
  
  describe("Authorization", () => {
    it("should reject unauthorized users", () => {
      // Mock unauthorized manager
      const originalHasPermission = mockTreasuryManager.hasPermission
      mockTreasuryManager.hasPermission = () => false
      
      const result = mockForecastingContract.recordCashFlow(1, 5000, 3000)
      
      expect(result.error).toBe("unauthorized")
      
      // Restore original function
      mockTreasuryManager.hasPermission = originalHasPermission
    })
  })
})
