"use client";

// Importações de bibliotecas e tipos
import React, { useState } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';

// Definição da interface para as linhas do CSV
interface CsvRow {
  CODIGO: string;
  LOTES: string;
  DESCRICAO: string;
  QTD_VOLUME: string;
  QTD_PECAS: string;
  DATA?: string;
}

// Componente principal da página
export default function HomePage() {
  // Estados para armazenar dados do CSV e status de carregamento
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Função para tratar upload do arquivo CSV
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Leitura e parsing do CSV
      Papa.parse<CsvRow>(file, {
        header: true,
        delimiter: ";", // Força o uso de ponto e vírgula como separador
        complete: (results) => {
          const filteredData = results.data.filter(row => row.CODIGO && row.LOTES);
          setCsvData(filteredData);
          console.log('Dados do CSV filtrados:', filteredData);
        },
      });
    }
  };

  /**
   * Função para gerar e baixar um arquivo CSV modelo.
   */
  const handleDownloadTemplate = () => {
    const headers = ["CODIGO", "LOTES", "DESCRICAO", "QTD_VOLUME", "QTD_PECAS", "DATA"];
    const exampleData = ["EXEMPLO001", "LOTE-A1", "Produto de Exemplo", "1", "10", "20/05/2024"];
    
    const csvContent = [
      headers.join(';'),
      exampleData.join(';')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função principal para gerar o PDF das etiquetas
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

    // Função auxiliar para gerar imagem do código de barras
    const generateBarcodeImage = (text: string): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        try {
          bwipjs.toCanvas(canvas, {
            bcid: 'code128',
            text: text,
            scale: 5,
            height: 5,
            includetext: true,
          });
          const barcodeImage = canvas.toDataURL("image/png");
          resolve(barcodeImage);
        } catch (error) {
          reject(error);
        }
      });
    };

    // Função para iterar sobre os dados e gerar as etiquetas
    const generateBarcodes = async () => {
      for (let index = 0; index < csvData.length; index++) {
        const row = csvData[index];

        if (!row.CODIGO || !row.LOTES) {
          console.error(`Linha ${index + 1} não contém valores necessários`);
          continue;
        }

        if (index > 0) {
          doc.addPage();
        }

        try {
          doc.setFont("Helvetica", "Bold");
          doc.setFontSize(11);

          const codigoBarcode = await generateBarcodeImage(row.CODIGO);
          doc.addImage(codigoBarcode, 'PNG', 0.1, 0.1, 9.8, 1.8);
          doc.text(`Código:`, 0.1, 1.8);

          doc.setFont("Helvetica", "Bold");
          doc.setFontSize(11);

          const descricaoTexto = doc.splitTextToSize(`Descrição: ${row.DESCRICAO}`, 9.8);
          doc.text(descricaoTexto, 0.1, 2.5);
          doc.text(`Volume (CX): ${row.QTD_VOLUME}`, 0.1, 3.8);
          doc.text(`Qtd Peças (UN): `, 3.9, 3.8);

          const data = row.DATA ? row.DATA : new Date().toLocaleDateString();
          doc.text(`Data: ${data}`, 3.1, 4.7, { align: 'right' });

          // Padroniza o valor de QTD_PECAS para ter no mínimo 2 dígitos.
          const qtdPecasPadded = row.QTD_PECAS.padStart(2, '0');
          
          // Gera o código de barras da quantidade de peças usando o valor com padding.
          const qtdPecasBarcode = await generateBarcodeImage(qtdPecasPadded);
          doc.addImage(qtdPecasBarcode, 'PNG', 6.9, 3.3, 3, 1.8);
          
          const lotesBarcode = await generateBarcodeImage(row.LOTES);
          doc.addImage(lotesBarcode, 'PNG', 0.1, 5.2, 9.8, 1.8);
          doc.text(`Lote:`, 0.1, 6.9);

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

  // Renderização do componente
  return (
    <div className="container">
      <img src="/logo.png" alt="Logo" className="logo" />
      <h1>Impressão de Etiquetas</h1>
      <input title="Import de Arquivo CSV" type="file" accept=".csv" onChange={handleFileUpload} className="fileInput" />
      
      <button 
        title="Botão para baixar o modelo de CSV" 
        type="button" 
        onClick={handleDownloadTemplate} 
        className="button-secondary"
      >
        Baixar Modelo CSV
      </button>

      <button title="Botão para gerar etiquetas" type="button" onClick={generatePDF} disabled={loading || csvData.length === 0} className="button">
        {loading ? 'Gerando...' : 'Gerar Etiquetas'}
      </button>
    </div>
  );
}