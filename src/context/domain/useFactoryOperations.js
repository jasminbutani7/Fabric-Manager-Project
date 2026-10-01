import { useMemo } from 'react';
import {
  mapMasterToDb,
  mapMachineToDb,
  mapTailorToDb,
  mapHelperToDb,
  mapSupplierToDb,
} from '../../services/dbMappers';
import { sanitizeMobileNumber, isValidMobileNumber } from '../../utils/formValidation';
import { generateEntityId } from '../../utils/idGenerator';

export function useFactoryOperations({
  masters,
  setMasters,
  machines,
  setMachines,
  tailors,
  setTailors,
  helpers,
  setHelpers,
  suppliers,
  setSuppliers,
  saveToDb,
  dbRemove,
}) {
  // Master Operations
  const addMaster = (masterData) => {
    const trimmedName = (masterData.name || '').trim();
    const cleanPhone = sanitizeMobileNumber(masterData.phone);

    if (!trimmedName) {
      return { success: false, error: 'Master name is required.' };
    }
    if (!isValidMobileNumber(cleanPhone)) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number starting with 6-9 for Master.' };
    }

    const newMaster = {
      id: generateEntityId('mst'),
      role: 'Master',
      name: trimmedName,
      phone: cleanPhone,
      specialization: masterData.specialization?.trim() || '',
      experience: masterData.experience?.trim() || '',
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0],
      leftDate: null,
      exitReason: null,
      password: masterData.password || 'master123',
      createdAt: new Date().toISOString(),
    };
    setMasters((prev) => [newMaster, ...prev]);
    saveToDb('masters', mapMasterToDb, newMaster);
    return { success: true, master: newMaster };
  };

  const updateMaster = (id, updates) => {
    setMasters((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const updated = {
            ...m,
            ...updates,
            name: updates.name ? updates.name.trim() : m.name,
            phone: updates.phone ? sanitizeMobileNumber(updates.phone) : m.phone,
            specialization: updates.specialization !== undefined ? updates.specialization.trim() : m.specialization,
            experience: updates.experience !== undefined ? updates.experience.trim() : m.experience,
          };
          saveToDb('masters', mapMasterToDb, updated);
          return updated;
        }
        return m;
      })
    );
    return { success: true };
  };

  // Machine Operations
  const addMachine = (machineData) => {
    let trimmedCode = (machineData.code || '').trim().toUpperCase();
    const trimmedName = (machineData.name || '').trim();

    if (!trimmedCode) {
      let nextNum = machines.length + 1;
      trimmedCode = `MCH-${String(nextNum).padStart(2, '0')}`;
      while (machines.some((m) => m.code.toUpperCase() === trimmedCode)) {
        nextNum += 1;
        trimmedCode = `MCH-${String(nextNum).padStart(2, '0')}`;
      }
    } else if (machines.some((m) => m.code.toUpperCase() === trimmedCode)) {
      return {
        success: false,
        error: `Machine Code "${trimmedCode}" already exists! Please enter a unique Machine Code.`,
      };
    }

    const machineId = generateEntityId('mch');
    const newMachine = {
      id: machineId,
      code: trimmedCode,
      name: trimmedName || trimmedCode,
      brand: machineData.brand?.trim() || '',
      model: machineData.model?.trim() || '',
      assignedTailorId: null,
      status: 'Active',
      maintenanceDate: null,
      notes: machineData.notes?.trim() || '',
      operatorHistory: [],
      createdAt: new Date().toISOString(),
    };

    setMachines((prev) => [newMachine, ...prev]);
    saveToDb('machines', mapMachineToDb, newMachine);
    return { success: true, machine: newMachine };
  };

  const updateMachine = (id, updates) => {
    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const updated = { ...m, ...updates };
          saveToDb('machines', mapMachineToDb, updated);
          return updated;
        }
        return m;
      })
    );
  };

  const deleteMachine = (id) => {
    setTailors((prev) =>
      prev.map((t) =>
        t.assignedMachineId === id ? { ...t, assignedMachineId: null } : t
      )
    );
    setMachines((prev) => prev.filter((m) => m.id !== id));
    dbRemove('machines', id);
  };

  // Tailor Operations & Machine Assignment
  const addTailor = (tailorData) => {
    const cleanPhone = sanitizeMobileNumber(tailorData.phone);
    const tailorId = generateEntityId('tlr');
    const newTailor = {
      id: tailorId,
      role: 'Tailor',
      name: tailorData.name.trim(),
      phone: cleanPhone || tailorData.phone.trim(),
      assignedMachineId: tailorData.assignedMachineId || null,
      specialty: tailorData.specialty?.trim() || 'Stitching',
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0],
      leftDate: null,
      exitReason: null,
      password: tailorData.password || 'tailor123',
      createdAt: new Date().toISOString(),
    };

    setTailors((prev) => [newTailor, ...prev]);
    saveToDb('tailors', mapTailorToDb, newTailor);

    if (tailorData.assignedMachineId) {
      setMachines((prev) =>
        prev.map((m) => {
          if (m.id === tailorData.assignedMachineId) {
            const updatedM = { ...m, assignedTailorId: tailorId };
            saveToDb('machines', mapMachineToDb, updatedM);
            return updatedM;
          }
          return m;
        })
      );
    }

    return newTailor;
  };

  const updateTailor = (id, updates) => {
    const currentTailor = tailors.find((t) => t.id === id);
    const oldMachineId = currentTailor?.assignedMachineId;
    const newMachineId = updates.assignedMachineId !== undefined ? updates.assignedMachineId : oldMachineId;

    if (updates.assignedMachineId !== undefined && oldMachineId !== newMachineId) {
      setMachines((prev) =>
        prev.map((m) => {
          if (newMachineId && m.id === newMachineId) {
            const updatedM = { ...m, assignedTailorId: id };
            saveToDb('machines', mapMachineToDb, updatedM);
            return updatedM;
          }
          if (oldMachineId && m.id === oldMachineId) {
            const updatedM = { ...m, assignedTailorId: null };
            saveToDb('machines', mapMachineToDb, updatedM);
            return updatedM;
          }
          return m;
        })
      );
    }

    setTailors((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = {
            ...t,
            ...updates,
            name: updates.name ? updates.name.trim() : t.name,
            phone: updates.phone ? sanitizeMobileNumber(updates.phone) : t.phone,
            assignedMachineId: updates.assignedMachineId !== undefined ? updates.assignedMachineId : t.assignedMachineId,
          };
          saveToDb('tailors', mapTailorToDb, updated);
          return updated;
        }
        return t;
      })
    );
    return { success: true };
  };

  // Assign or Reassign Tailor to Machine
  const assignTailorToMachine = (tailorId, machineId) => {
    const currentTailor = tailors.find((t) => t.id === tailorId);
    const prevMachineId = currentTailor?.assignedMachineId;

    const machineBeingAssigned = machines.find((m) => m.id === machineId);
    const displacedTailorId = machineBeingAssigned?.assignedTailorId;

    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          const updated = { ...m, assignedTailorId: tailorId };
          saveToDb('machines', mapMachineToDb, updated);
          return updated;
        }
        if (prevMachineId && m.id === prevMachineId && m.id !== machineId) {
          const updated = { ...m, assignedTailorId: null };
          saveToDb('machines', mapMachineToDb, updated);
          return updated;
        }
        return m;
      })
    );

    setTailors((prev) =>
      prev.map((t) => {
        if (t.id === tailorId) {
          const updated = { ...t, assignedMachineId: machineId };
          saveToDb('tailors', mapTailorToDb, updated);
          return updated;
        }
        if (displacedTailorId && t.id === displacedTailorId && t.id !== tailorId) {
          const updated = { ...t, assignedMachineId: null };
          saveToDb('tailors', mapTailorToDb, updated);
          return updated;
        }
        return t;
      })
    );
  };

  const unassignTailorFromMachine = (tailorId) => {
    const currentTailor = tailors.find((t) => t.id === tailorId);
    const machineId = currentTailor?.assignedMachineId;

    if (machineId) {
      setMachines((prev) =>
        prev.map((m) => {
          if (m.id === machineId) {
            const updated = { ...m, assignedTailorId: null };
            saveToDb('machines', mapMachineToDb, updated);
            return updated;
          }
          return m;
        })
      );
    }

    setTailors((prev) =>
      prev.map((t) => {
        if (t.id === tailorId) {
          const updated = { ...t, assignedMachineId: null };
          saveToDb('tailors', mapTailorToDb, updated);
          return updated;
        }
        return t;
      })
    );
  };

  /**
   * FLEXIBLE REPLACEMENT WORKFLOW
   * Relieve a worker when they leave (marks them 'Left', records exit date, preserves all data).
   */
  const relieveWorker = (type, id, exitReason = 'Relieved from duties') => {
    const today = new Date().toISOString().split('T')[0];

    if (type === 'tailor') {
      const tailor = tailors.find((t) => t.id === id);
      const machineId = tailor?.assignedMachineId;

      if (machineId) {
        setMachines((prev) =>
          prev.map((m) => {
            if (m.id === machineId) {
              const historyEntry = {
                id: generateEntityId('hist'),
                tailorId: tailor.id,
                tailorName: tailor.name,
                phone: tailor.phone,
                fromDate: tailor.joinedDate || tailor.createdAt?.split('T')[0] || today,
                toDate: today,
                reason: exitReason,
              };
              const existingHistory = m.operatorHistory || [];
              const updatedMachine = {
                ...m,
                assignedTailorId: null,
                operatorHistory: [historyEntry, ...existingHistory],
              };
              saveToDb('machines', mapMachineToDb, updatedMachine);
              return updatedMachine;
            }
            return m;
          })
        );
      }

      setTailors((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updatedTailor = {
              ...t,
              status: 'Left',
              assignedMachineId: null,
              leftDate: today,
              exitReason,
            };
            saveToDb('tailors', mapTailorToDb, updatedTailor);
            return updatedTailor;
          }
          return t;
        })
      );
    } else if (type === 'master') {
      setMasters((prev) =>
        prev.map((m) => {
          if (m.id === id) {
            const updatedMaster = {
              ...m,
              status: 'Left',
              leftDate: today,
              exitReason,
            };
            saveToDb('masters', mapMasterToDb, updatedMaster);
            return updatedMaster;
          }
          return m;
        })
      );
      // If master leaves, unassign any helpers assigned to this master
      setHelpers((prev) =>
        prev.map((h) => {
          if (h.assignedMasterId === id) {
            const updatedHelper = { ...h, assignedMasterId: null, helperType: 'general' };
            saveToDb('helpers', mapHelperToDb, updatedHelper);
            return updatedHelper;
          }
          return h;
        })
      );
    } else if (type === 'helper') {
      setHelpers((prev) =>
        prev.map((h) => {
          if (h.id === id) {
            const updatedHelper = {
              ...h,
              status: 'Left',
              assignedMachineId: null,
              leftDate: today,
              exitReason,
            };
            saveToDb('helpers', mapHelperToDb, updatedHelper);
            return updatedHelper;
          }
          return h;
        })
      );
    }
  };

  /**
   * REPLACE TAILOR ON A MACHINE
   */
  const replaceTailorOnMachine = ({
    machineId,
    oldTailorId,
    newTailorId,
    markOldTailorAsLeft = true,
    exitReason = 'Replaced by new operator',
  }) => {
    const today = new Date().toISOString().split('T')[0];
    const machine = machines.find((m) => m.id === machineId);
    const oldTailor = tailors.find((t) => t.id === oldTailorId);

    if (!machine) return;

    if (oldTailor) {
      const historyEntry = {
        id: generateEntityId('hist'),
        tailorId: oldTailor.id,
        tailorName: oldTailor.name,
        phone: oldTailor.phone,
        fromDate: oldTailor.joinedDate || oldTailor.createdAt?.split('T')[0] || today,
        toDate: today,
        reason: exitReason,
      };

      setMachines((prev) =>
        prev.map((m) => {
          if (m.id === machineId) {
            const existingHistory = m.operatorHistory || [];
            const updatedM = {
              ...m,
              assignedTailorId: newTailorId || null,
              operatorHistory: [historyEntry, ...existingHistory],
            };
            saveToDb('machines', mapMachineToDb, updatedM);
            return updatedM;
          }
          return m;
        })
      );

      if (markOldTailorAsLeft) {
        setTailors((prev) =>
          prev.map((t) => {
            if (t.id === oldTailorId) {
              const updatedT = {
                ...t,
                status: 'Left',
                assignedMachineId: null,
                leftDate: today,
                exitReason,
              };
              saveToDb('tailors', mapTailorToDb, updatedT);
              return updatedT;
            }
            return t;
          })
        );
      } else {
        setTailors((prev) =>
          prev.map((t) => {
            if (t.id === oldTailorId) {
              const updatedT = { ...t, assignedMachineId: null };
              saveToDb('tailors', mapTailorToDb, updatedT);
              return updatedT;
            }
            return t;
          })
        );
      }
    } else {
      setMachines((prev) =>
        prev.map((m) => {
          if (m.id === machineId) {
            const updatedM = { ...m, assignedTailorId: newTailorId || null };
            saveToDb('machines', mapMachineToDb, updatedM);
            return updatedM;
          }
          return m;
        })
      );
    }

    if (newTailorId) {
      setTailors((prev) =>
        prev.map((t) => {
          if (t.id === newTailorId) {
            const updatedT = { ...t, assignedMachineId: machineId, status: 'Active' };
            saveToDb('tailors', mapTailorToDb, updatedT);
            return updatedT;
          }
          return t;
        })
      );
    }
  };

  /**
   * REACTIVATE FORMER WORKER
   */
  const reactivateWorker = (type, id) => {
    const today = new Date().toISOString().split('T')[0];
    if (type === 'tailor') {
      setTailors((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updatedT = {
              ...t,
              status: 'Active',
              leftDate: null,
              exitReason: null,
              joinedDate: today,
            };
            saveToDb('tailors', mapTailorToDb, updatedT);
            return updatedT;
          }
          return t;
        })
      );
    } else if (type === 'master') {
      setMasters((prev) =>
        prev.map((m) => {
          if (m.id === id) {
            const updatedM = {
              ...m,
              status: 'Active',
              leftDate: null,
              exitReason: null,
              joinedDate: today,
            };
            saveToDb('masters', mapMasterToDb, updatedM);
            return updatedM;
          }
          return m;
        })
      );
    } else if (type === 'helper') {
      setHelpers((prev) =>
        prev.map((h) => {
          if (h.id === id) {
            const updatedH = {
              ...h,
              status: 'Active',
              leftDate: null,
              exitReason: null,
              joinedDate: today,
            };
            saveToDb('helpers', mapHelperToDb, updatedH);
            return updatedH;
          }
          return h;
        })
      );
    }
  };

  // Helper Operations
  const addHelper = (helperData) => {
    const trimmedName = (helperData.name || '').trim();
    const cleanPhone = sanitizeMobileNumber(helperData.phone);

    if (!trimmedName) {
      return { success: false, error: 'Helper Name is required.' };
    }
    if (!isValidMobileNumber(cleanPhone)) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number starting with 6-9 for Helper.' };
    }

    const helperCategory =
      helperData.helperCategory ||
      (helperData.helperType === 'master_assigned'
        ? 'master_assigned'
        : helperData.wageType === 'Piece Rate'
          ? 'external'
          : 'internal');

    const helperId = generateEntityId('hlp');
    const newHelper = {
      id: helperId,
      role: 'Helper',
      name: trimmedName,
      phone: cleanPhone,
      helperCategory,
      helperType: helperCategory === 'master_assigned' ? 'master_assigned' : 'general',
      assignedMasterId: helperCategory === 'master_assigned' ? helperData.assignedMasterId : null,
      workType:
        helperData.workType?.trim() ||
        (helperCategory === 'master_assigned'
          ? 'Cutting Table Assistant'
          : helperCategory === 'external'
            ? 'Thread Cutting (Piece Rate)'
            : 'Thread Trimming & General Chores'),
      wageType:
        helperData.wageType ||
        (helperCategory === 'external'
          ? 'Piece Rate'
          : helperCategory === 'internal'
            ? 'Monthly Fixed'
            : 'Daily Wage'),
      defaultRatePerPSC:
        parseFloat(helperData.defaultRatePerPSC) ||
        (helperCategory === 'external' ? 2.5 : 0),
      notes: helperData.notes?.trim() || '',
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0],
      leftDate: null,
      exitReason: null,
      createdAt: new Date().toISOString(),
    };

    setHelpers((prev) => [newHelper, ...prev]);
    saveToDb('helpers', mapHelperToDb, newHelper);
    return { success: true, helper: newHelper };
  };

  const updateHelper = (id, updates) => {
    setHelpers((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const updated = { ...h, ...updates };
          if (updates.phone) {
            updated.phone = sanitizeMobileNumber(updates.phone);
          }
          saveToDb('helpers', mapHelperToDb, updated);
          return updated;
        }
        return h;
      })
    );
  };

  // Permanent Delete if Admin explicitly wants to remove
  const deleteWorkerPermanent = (type, id) => {
    if (type === 'tailor') {
      const tailor = tailors.find((t) => t.id === id);
      if (tailor?.assignedMachineId) {
        setMachines((prev) =>
          prev.map((m) =>
            m.id === tailor.assignedMachineId ? { ...m, assignedTailorId: null } : m
          )
        );
      }
      setTailors((prev) => prev.filter((t) => t.id !== id));
      dbRemove('tailors', id);
    } else if (type === 'master') {
      setMasters((prev) => prev.filter((m) => m.id !== id));
      setHelpers((prev) =>
        prev.map((h) =>
          h.assignedMasterId === id
            ? { ...h, assignedMasterId: null, helperType: 'general' }
            : h
        )
      );
      dbRemove('masters', id);
    } else if (type === 'helper') {
      setHelpers((prev) => prev.filter((h) => h.id !== id));
      dbRemove('helpers', id);
    }
  };

  /**
   * SUPPLIER MANAGEMENT
   */
  const addSupplier = (supplierData) => {
    const firmName = (supplierData.name || '').trim();
    const contactPerson = (supplierData.contactPerson || '').trim();
    const cleanPhone = sanitizeMobileNumber(supplierData.phone);
    const cleanWhatsapp = sanitizeMobileNumber(supplierData.whatsapp);

    if (!firmName) {
      return { success: false, error: 'Supplier / Firm Name is required.' };
    }

    if (!contactPerson) {
      return { success: false, error: 'Contact Person Name is required.' };
    }

    if (!isValidMobileNumber(cleanPhone)) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number starting with 6-9 for Supplier.' };
    }

    const isDuplicateName = suppliers.some(
      (s) => s.name.toLowerCase().trim() === firmName.toLowerCase()
    );
    if (isDuplicateName) {
      return {
        success: false,
        error: `A supplier with the name "${firmName}" already exists. Please choose a unique name.`,
      };
    }

    const isDuplicatePhone = suppliers.some(
      (s) => s.phone && s.phone.replace(/\D/g, '') === cleanPhone
    );
    if (isDuplicatePhone) {
      return {
        success: false,
        error: `A supplier with phone number "${cleanPhone}" already exists.`,
      };
    }

    const newSupplier = {
      id: generateEntityId('sup'),
      name: firmName,
      contactPerson: (supplierData.contactPerson || '').trim(),
      phone: cleanPhone,
      whatsapp: cleanWhatsapp,
      category: supplierData.category || 'Fabric / Cloth',
      address: (supplierData.address || '').trim(),
      gstNumber: (supplierData.gstNumber || '').trim().toUpperCase(),
      paymentTerms: supplierData.paymentTerms || '30 Days Credit',
      notes: (supplierData.notes || '').trim(),
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    setSuppliers((prev) => [newSupplier, ...prev]);
    saveToDb('suppliers', mapSupplierToDb, newSupplier);
    return { success: true, supplier: newSupplier };
  };

  const updateSupplier = (id, updatedData) => {
    const firmName = (updatedData.name || '').trim();
    const cleanPhone = updatedData.phone !== undefined ? sanitizeMobileNumber(updatedData.phone) : undefined;
    const cleanWhatsapp = updatedData.whatsapp !== undefined ? sanitizeMobileNumber(updatedData.whatsapp) : undefined;

    if (firmName) {
      const isDuplicateName = suppliers.some(
        (s) => s.id !== id && s.name.toLowerCase().trim() === firmName.toLowerCase()
      );
      if (isDuplicateName) {
        return {
          success: false,
          error: `Another supplier with the name "${firmName}" already exists.`,
        };
      }
    }

    if (updatedData.contactPerson !== undefined && !updatedData.contactPerson.trim()) {
      return { success: false, error: 'Contact Person Name is required.' };
    }

    if (cleanPhone !== undefined) {
      if (!isValidMobileNumber(cleanPhone)) {
        return { success: false, error: 'Please enter a valid 10-digit mobile number starting with 6-9.' };
      }
      const isDuplicatePhone = suppliers.some(
        (s) => s.id !== id && s.phone && s.phone.replace(/\D/g, '') === cleanPhone
      );
      if (isDuplicatePhone) {
        return {
          success: false,
          error: `Another supplier with phone number "${cleanPhone}" already exists.`,
        };
      }
    }

    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = {
            ...s,
            ...updatedData,
            ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
            ...(cleanWhatsapp !== undefined ? { whatsapp: cleanWhatsapp } : {}),
          };
          saveToDb('suppliers', mapSupplierToDb, updated);
          return updated;
        }
        return s;
      })
    );
    return { success: true };
  };

  const deleteSupplier = (id) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    dbRemove('suppliers', id);
    return { success: true };
  };

  const factoryValue = useMemo(
    () => ({
      masters,
      machines,
      tailors,
      helpers,
      suppliers,
      addMaster,
      updateMaster,
      addMachine,
      updateMachine,
      deleteMachine,
      addTailor,
      updateTailor,
      assignTailorToMachine,
      unassignTailorFromMachine,
      addHelper,
      updateHelper,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      relieveWorker,
      replaceTailorOnMachine,
      reactivateWorker,
      deleteWorkerPermanent,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [masters, machines, tailors, helpers, suppliers]
  );

  return {
    factoryValue,
    addMaster,
    updateMaster,
    addMachine,
    updateMachine,
    deleteMachine,
    addTailor,
    updateTailor,
    assignTailorToMachine,
    unassignTailorFromMachine,
    addHelper,
    updateHelper,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    relieveWorker,
    replaceTailorOnMachine,
    reactivateWorker,
    deleteWorkerPermanent,
  };
}
