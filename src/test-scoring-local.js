/**
 * TEST-SCORING-LOCAL.JS
 * Suite de pruebas unitarias para el motor de puntos de la Quiniela Mundialista.
 * Ejecuta y valida de forma automática las 6 reglas de la matriz de puntos.
 */

// Lógica idéntica a la implementada en scoringEngine.ts
function calculateMatchPoints(predHome, predAway, realHome, realAway) {
  if (predHome < 0 || predAway < 0 || realHome < 0 || realAway < 0) {
    return 0;
  }

  // Caso 1: Marcador Exacto (+5 puntos)
  if (predHome === realHome && predAway === realAway) {
    return 5;
  }

  const predSign = Math.sign(predHome - predAway);
  const realSign = Math.sign(realHome - realAway);

  // Casos 2 y 3: Acertar Ganador o Empate sin marcador exacto (+3 puntos)
  if (predSign === realSign) {
    return 3;
  }

  // Casos 4 y 5: Consolaciones por aproximación (+1 punto)
  if (predSign === 0 || realSign === 0) {
    return 1;
  }

  // Caso 6: Ganador Incorrecto (0 puntos)
  return 0;
}

// Casos de prueba definidos en base a la matriz del sistema de puntos
const testCases = [
  // 1. Marcador Exacto (+5)
  { pred: [2, 1], real: [2, 1], expected: 5, desc: "Marcador exacto - Local gana (2-1 vs 2-1)" },
  { pred: [1, 1], real: [1, 1], expected: 5, desc: "Marcador exacto - Empate (1-1 vs 1-1)" },
  { pred: [0, 3], real: [0, 3], expected: 5, desc: "Marcador exacto - Visitante gana (0-3 vs 0-3)" },

  // 2. Acertar Ganador, no marcador exacto (+3)
  { pred: [2, 1], real: [1, 0], expected: 3, desc: "Acierta Ganador Local, no goles exactos (2-1 vs 1-0)" },
  { pred: [1, 4], real: [2, 5], expected: 3, desc: "Acierta Ganador Visitante, no goles exactos (1-4 vs 2-5)" },

  // 3. Acertar Empate, no marcador exacto (+3)
  { pred: [1, 1], real: [2, 2], expected: 3, desc: "Acierta Empate, no goles exactos (1-1 vs 2-2)" },
  { pred: [0, 0], real: [3, 3], expected: 3, desc: "Acierta Empate, no goles exactos (0-0 vs 3-3)" },

  // 4. Predijo Empate, ganó cualquier equipo - Consolación (+1)
  { pred: [1, 1], real: [2, 1], expected: 1, desc: "Predijo Empate, pero ganó Local - Consolación (1-1 vs 2-1)" },
  { pred: [2, 2], real: [0, 3], expected: 1, desc: "Predijo Empate, pero ganó Visitante - Consolación (2-2 vs 0-3)" },

  // 5. Predijo Ganador, quedó empate - Consolación (+1)
  { pred: [2, 1], real: [1, 1], expected: 1, desc: "Predijo gana Local, quedó Empate - Consolación (2-1 vs 1-1)" },
  { pred: [0, 2], real: [2, 2], expected: 1, desc: "Predijo gana Visitante, quedó Empate - Consolación (0-2 vs 2-2)" },

  // 6. Ganador Incorrecto (0)
  { pred: [2, 1], real: [0, 2], expected: 0, desc: "Predijo gana Local, ganó Visitante (2-1 vs 0-2)" },
  { pred: [0, 3], real: [3, 1], expected: 0, desc: "Predijo gana Visitante, ganó Local (0-3 vs 3-1)" }
];

console.log("\n========================================================");
console.log("RUNNING SCORING ENGINE TESTS - PLATAFORMA DE QUINIELAS");
console.log("========================================================\n");

let passedCount = 0;
const resultsTable = [];

testCases.forEach((tc, idx) => {
  const result = calculateMatchPoints(tc.pred[0], tc.pred[1], tc.real[0], tc.real[1]);
  const status = result === tc.expected ? "PASSED" : "FAILED";
  
  if (result === tc.expected) {
    passedCount++;
  }

  resultsTable.push({
    "N°": idx + 1,
    "Descripción": tc.desc,
    "Pred": `[${tc.pred.join("-")}]`,
    "Real": `[${tc.real.join("-")}]`,
    "Esperado": tc.expected,
    "Obtenido": result,
    "Estado": status
  });
});

console.table(resultsTable);

console.log("\n========================================================");
console.log(`RESULTADO FINAL: ${passedCount} / ${testCases.length} PRUEBAS PASADAS`);
if (passedCount === testCases.length) {
  console.log("ESTADO: EXITOSO (El motor calcula correctamente la matriz de puntos)");
} else {
  console.log("ESTADO: ERROR (Hay discrepancias en los puntos calculados)");
}
console.log("========================================================\n");
