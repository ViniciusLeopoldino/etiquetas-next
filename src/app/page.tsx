"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';

export default function HomePage() {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setCsvData(results.data);
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

    // Verifica se a coluna 'LOTES' está presente no cabeçalho
    if (!csvData[0].hasOwnProperty('LOTES')) {
      console.error("O arquivo CSV não contém a coluna 'LOTES'.");
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
      for (let index = 1; index < csvData.length; index++) { // Começar do índice 1 para ignorar o cabeçalho
        const row = csvData[index];

        // Verifica se a linha contém um valor para 'LOTES' e se não é vazia
        if (!row['LOTES'] || row['LOTES'].trim() === '') {
          console.warn(`Linha ${index + 1} não contém um valor para 'LOTES' ou está vazia.`);
          continue; // Ignora esta linha se não tiver 'LOTES'
        }

        if (index > 1) {
          doc.addPage();
        }

        try {
          const barcodeImage = await generateBarcodeImage(row['LOTES']);
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

