"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';

// Defina a interface para os dados CSV
interface CsvRow {
  LOTES: string; // Defina os tipos adequados
}

export default function HomePage() {
  const [csvData, setCsvData] = useState<CsvRow[]>([]); // Use CsvRow em vez de any
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setCsvData(results.data as CsvRow[]); // Faça o type assertion aqui
          console.log('Dados do CSV:', results.data);
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
