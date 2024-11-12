"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';

interface CsvRow {
  LOTES: string;
  CODIGO: string;
  DESCRICAO: string;
  QTD_VOLUME: string;
  QTD_PECAS: string;
}

export default function HomePage() {
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse<CsvRow>(file, {
        header: true,
        complete: (results) => {
          const filteredData = results.data.filter(row => row.LOTES && row.LOTES.trim() !== "");
          setCsvData(filteredData);
          console.log('Dados do CSV filtrados:', filteredData);
        },
      });
    }
  };

  const generatePDF = async () => {
    setLoading(true);
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
            scale: 10, // Reduz o tamanho do código de barras
            height: 10, // Reduz a altura do código de barras
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
          doc.addImage(barcodeImage, 'PNG', 0.5, 1, 9, 2); // Ajusta o tamanho para caber as demais informações

          // Define o tamanho da fonte para cada campo
          doc.setFontSize(10); // Tamanho para o código
          doc.text(`Código: ${row.CODIGO}`, 0.5, 4);

          doc.setFontSize(10); // Tamanho menor para descrição
          const descricaoTexto = doc.splitTextToSize(`Descrição: ${row.DESCRICAO}`, 9);
          doc.text(descricaoTexto, 0.5, 4.5);

          doc.setFontSize(10); // Tamanho para Qtd Volume e Qtd Peças
          doc.text(`Qtd Volume: ${row.QTD_VOLUME}`, 0.5, 5.5);
          doc.text(`Qtd Peças: ${row.QTD_PECAS}`, 0.5, 6);

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
    <div className="container">
      <img src="/logo.png" alt="Logo" className="logo" />
      <h1>Impressão de Etiquetas</h1>
      <p>Importar CSV</p>
      <input type="file" accept=".csv" onChange={handleFileUpload} className="fileInput" />
      <button onClick={generatePDF} disabled={loading} className="button">
        {loading ? 'Gerando...' : 'Gerar Etiquetas'}
      </button>
    </div>
  );
}
