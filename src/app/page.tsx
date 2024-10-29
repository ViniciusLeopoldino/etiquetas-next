"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';

// Definindo um tipo para os dados do CSV
interface CsvRow {
  LOTES: string; // Defina como string, pois é o que estamos esperando
}

export default function HomePage() {
  const [csvData, setCsvData] = useState<CsvRow[]>([]); // Usando o tipo CsvRow
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse<CsvRow>(file, { // Adicionando o tipo aqui também
        header: true,
        complete: (results) => {
          // Filtrando linhas que não têm valor na coluna 'LOTES'
          const filteredData = results.data.filter(row => row.LOTES && row.LOTES.trim() !== "");
          setCsvData(filteredData);
          console.log('Dados do CSV filtrados:', filteredData);
        },
      });
    }
  };

  const generatePDF = async () => {
    setLoading(true);
    console.log('Gerando PDF...');
    if (!csvData || csvData.length === 0) {
      console.error("Nenhum dado CSV encontrado");
      setLoading(false);
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'cm',
      format: [10, 7],
    });

    const generateBarcodeImage = (text: string): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        try {
          bwipjs.toCanvas(canvas, {
            bcid: 'code128',
            text: text,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: 'center',
          });
          const barcodeImage = canvas.toDataURL("image/png");
          resolve(barcodeImage);
        } catch (error) {
          reject(error);
        }
      });
    };

    const generateBarcodes = async () => {
      for (let index = 0; index < csvData.length; index++) {
        const row = csvData[index];
        if (!row.LOTES) {
          console.error(`Linha ${index + 1} não contém um valor para 'LOTES'`);
          continue;
        }
        if (index > 0) {
          doc.addPage();
        }

        try {
          const barcodeImage = await generateBarcodeImage(row.LOTES);
          doc.addImage(barcodeImage, 'PNG', 2, 1, 6, 4);
        } catch (error) {
          console.error("Erro ao gerar código de barras:", error);
        }
      }

      doc.save("Etiquetas.pdf");
    };

    try {
      await generateBarcodes();
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Importar arquivo CSV</h1>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      <button onClick={generatePDF} disabled={loading}>
        {loading ? 'Gerando...' : 'Gerar PDFs'}
      </button>
    </div>
  );
}
