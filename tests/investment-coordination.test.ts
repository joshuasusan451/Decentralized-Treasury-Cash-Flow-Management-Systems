import { describe, it, expect, beforeEach } from "vitest"

// Mock contract state
let contractState = {
  treasuryManagers: new Map(),
  managerDetails: new Map(),
  totalManagers: 0,
  contractOwner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
}

// Mock contract functions
const mockContract = {
  addManager: (manager, permissions) => {
    if (contractState.treasuryManagers.has(manager)) {
      return { error: "already-exists" }
    }
    
    contractState.treasuryManagers.set(manager, true)
    contractState.managerDetails.set(manager, {
      verified: true,
      createdAt: Date.now(),
      permissions: permissions,
    })
    contractState.totalManagers++
    
    return { success: true, data: manager }
  },
  
  removeManager: (manager) => {
    if (!contractState.treasuryManagers.has(manager)) {
      return { error: "not-found" }
    }
    
    contractState.treasuryManagers.delete(manager)
    contractState.managerDetails.delete(manager)
    contractState.totalManagers--
    
    return { success: true, data: manager }
  },
  
  updatePermissions: (manager, newPermissions) => {
    if (!contractState.treasuryManagers.has(manager)) {
      return { error: "not-found" }
    }
    
    const details = contractState.managerDetails.get(manager)
    contractState.managerDetails.set(manager, {
      ...details,
      permissions: newPermissions,
    })
    
    return { success: true, data: newPermissions }
  },
  
  isManager: (manager) => {
    return contractState.treasuryManagers.has(manager)
  },
  
  hasPermission: (manager, permission) => {
    const details = contractState.managerDetails.get(manager)
    if (!details) return false
    return (details.permissions & permission) > 0
  },
  
  getManagerInfo: (manager) => {
    return contractState.managerDetails.get(manager) || null
  },
  
  getTotalManagers: () => {
    return contractState.totalManagers
  },
}

describe("Treasury Manager Verification Contract", () => {
  beforeEach(() => {
    // Reset contract state before each test
    contractState = {
      treasuryManagers: new Map(),
      managerDetails: new Map(),
      totalManagers: 0,
      contractOwner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    }
  })
  
  describe("Manager Registration", () => {
    it("should add a new treasury manager successfully", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const permissions = 15 // All permissions (1+2+4+8)
      
      const result = mockContract.addManager(manager, permissions)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(manager)
      expect(mockContract.isManager(manager)).toBe(true)
      expect(mockContract.getTotalManagers()).toBe(1)
    })
    
    it("should reject adding duplicate manager", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const permissions = 15
      
      mockContract.addManager(manager, permissions)
      const result = mockContract.addManager(manager, permissions)
      
      expect(result.error).toBe("already-exists")
      expect(mockContract.getTotalManagers()).toBe(1)
    })
    
    it("should remove a treasury manager successfully", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const permissions = 15
      
      mockContract.addManager(manager, permissions)
      const result = mockContract.removeManager(manager)
      
      expect(result.success).toBe(true)
      expect(mockContract.isManager(manager)).toBe(false)
      expect(mockContract.getTotalManagers()).toBe(0)
    })
    
    it("should reject removing non-existent manager", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      const result = mockContract.removeManager(manager)
      
      expect(result.error).toBe("not-found")
    })
  })
  
  describe("Permission Management", () => {
    it("should update manager permissions successfully", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const initialPermissions = 7 // 1+2+4
      const newPermissions = 15 // 1+2+4+8
      
      mockContract.addManager(manager, initialPermissions)
      const result = mockContract.updatePermissions(manager, newPermissions)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(newPermissions)
      
      const managerInfo = mockContract.getManagerInfo(manager)
      expect(managerInfo.permissions).toBe(newPermissions)
    })
    
    it("should check specific permissions correctly", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const permissions = 5 // 1+4 (cash forecasting + investment coordination)
      
      mockContract.addManager(manager, permissions)
      
      expect(mockContract.hasPermission(manager, 1)).toBe(true) // Cash forecasting
      expect(mockContract.hasPermission(manager, 2)).toBe(false) // Liquidity management
      expect(mockContract.hasPermission(manager, 4)).toBe(true) // Investment coordination
      expect(mockContract.hasPermission(manager, 8)).toBe(false) // Risk management
    })
    
    it("should return false for permissions of non-existent manager", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      expect(mockContract.hasPermission(manager, 1)).toBe(false)
    })
  })
  
  describe("Manager Information", () => {
    it("should return complete manager information", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const permissions = 15
      
      mockContract.addManager(manager, permissions)
      const info = mockContract.getManagerInfo(manager)
      
      expect(info).toBeDefined()
      expect(info.verified).toBe(true)
      expect(info.permissions).toBe(permissions)
      expect(info.createdAt).toBeDefined()
    })
    
    it("should return null for non-existent manager", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      const info = mockContract.getManagerInfo(manager)
      
      expect(info).toBeNull()
    })
    
    it("should track total managers count correctly", () => {
      const manager1 = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const manager2 = "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5"
      
      expect(mockContract.getTotalManagers()).toBe(0)
      
      mockContract.addManager(manager1, 15)
      expect(mockContract.getTotalManagers()).toBe(1)
      
      mockContract.addManager(manager2, 7)
      expect(mockContract.getTotalManagers()).toBe(2)
      
      mockContract.removeManager(manager1)
      expect(mockContract.getTotalManagers()).toBe(1)
    })
  })
  
  describe("Permission Bit Flags", () => {
    it("should handle multiple permission combinations correctly", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      // Test individual permissions
      mockContract.addManager(manager, 1) // Cash forecasting only
      expect(mockContract.hasPermission(manager, 1)).toBe(true)
      expect(mockContract.hasPermission(manager, 2)).toBe(false)
      expect(mockContract.hasPermission(manager, 4)).toBe(false)
      expect(mockContract.hasPermission(manager, 8)).toBe(false)
      
      // Test combined permissions
      mockContract.updatePermissions(manager, 6) // Liquidity (2) + Investment (4)
      expect(mockContract.hasPermission(manager, 1)).toBe(false)
      expect(mockContract.hasPermission(manager, 2)).toBe(true)
      expect(mockContract.hasPermission(manager, 4)).toBe(true)
      expect(mockContract.hasPermission(manager, 8)).toBe(false)
      
      // Test all permissions
      mockContract.updatePermissions(manager, 15) // All permissions
      expect(mockContract.hasPermission(manager, 1)).toBe(true)
      expect(mockContract.hasPermission(manager, 2)).toBe(true)
      expect(mockContract.hasPermission(manager, 4)).toBe(true)
      expect(mockContract.hasPermission(manager, 8)).toBe(true)
    })
  })
})
