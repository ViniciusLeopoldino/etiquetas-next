"use client"; // Indica que este componente deve ser renderizado no lado do cliente.

import React, { useState } from 'react'; // Importa React e o hook useState para gerenciar estado.
import Papa from 'papaparse'; // Importa a biblioteca Papa Parse para analisar arquivos CSV.
import jsPDF from 'jspdf'; // Importa jsPDF para gerar PDFs.
import bwipjs from 'bwip-js'; // Importa bwip-js para gerar códigos de barras.

interface CsvRow {
  LOTES: string; // Define a estrutura de cada linha do CSV, com uma propriedade 'LOTES'.
}

export default function HomePage() {
  const [csvData, setCsvData] = useState<CsvRow[]>([]); // Estado para armazenar os dados filtrados do CSV.
  const [loading, setLoading] = useState(false); // Estado para controlar o carregamento ao gerar PDF.

  // Função para lidar com o upload do arquivo CSV.
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Obtém o arquivo do input.
    if (file) { // Verifica se um arquivo foi selecionado.
      Papa.parse<CsvRow>(file, { // Usa Papa Parse para analisar o arquivo CSV.
        header: true, // Indica que o CSV tem cabeçalho.
        complete: (results) => { // Callback chamado quando a análise é concluída.
          // Filtra os dados para remover linhas sem valores em 'LOTES'.
          const filteredData = results.data.filter(row => row.LOTES && row.LOTES.trim() !== "");
          setCsvData(filteredData); // Atualiza o estado com os dados filtrados.
          console.log('Dados do CSV filtrados:', filteredData); // Log dos dados filtrados.
        },
      });
    }
  };

  // Função assíncrona para gerar o PDF.
  const generatePDF = async () => {
    setLoading(true); // Define o estado de carregamento como verdadeiro.
    console.log('Gerando PDF...'); // Log para indicar que o PDF está sendo gerado.
    
    // Verifica se há dados CSV disponíveis.
    if (!csvData || csvData.length === 0) {
      console.error("Nenhum dado CSV encontrado"); // Log de erro caso não haja dados.
      setLoading(false); // Define o estado de carregamento como falso.
      return; // Encerra a função se não houver dados.
    }

    // Inicializa um novo documento PDF com orientação horizontal e dimensões especificadas.
    const doc = new jsPDF({
      orientation: 'landscape', // Define a orientação do PDF.
      unit: 'cm', // Define a unidade de medida como centímetros.
      format: [10, 7], // Define o formato do PDF.
    });

    // Função para gerar a imagem do código de barras.
    const generateBarcodeImage = (text: string): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas'); // Cria um elemento canvas para desenhar o código de barras.
        try {
          // Gera o código de barras no canvas usando bwip-js.
          bwipjs.toCanvas(canvas, {
            bcid: 'code128', // Define o tipo de código de barras.
            text: text, // Define o texto a ser codificado no código de barras.
            scale: 3, // Escala do código de barras.
            height: 10, // Altura do código de barras.
            includetext: true, // Inclui texto abaixo do código de barras.
            textxalign: 'center', // Alinhamento do texto.
          });
          const barcodeImage = canvas.toDataURL("image/png"); // Converte o canvas em uma imagem PNG.
          resolve(barcodeImage); // Resolve a promessa com a imagem gerada.
        } catch (error) {
          reject(error); // Rejeita a promessa em caso de erro.
        }
      });
    };

    // Função assíncrona para gerar os códigos de barras para cada linha de dados.
    const generateBarcodes = async () => {
      for (let index = 0; index < csvData.length; index++) {
        const row = csvData[index]; // Obtém a linha atual dos dados filtrados.
        
        // Verifica se a linha contém um valor para 'LOTES'.
        if (!row.LOTES) {
          console.error(`Linha ${index + 1} não contém um valor para 'LOTES'`); // Log de erro caso não haja valor.
          continue; // Continua para a próxima iteração do loop.
        }
        
        // Adiciona uma nova página ao PDF se não for a primeira linha.
        if (index > 0) {
          doc.addPage();
        }

        try {
          const barcodeImage = await generateBarcodeImage(row.LOTES); // Gera a imagem do código de barras.
          // Adiciona a imagem do código de barras ao PDF na posição (1, 1) com largura 8 e altura 5 cm.
          doc.addImage(barcodeImage, 'PNG', 1, 1, 8, 5); // Ajuste a posição e o tamanho da imagem
        } catch (error) {
          console.error("Erro ao gerar código de barras:", error); // Log de erro caso ocorra um problema na geração.
        }
      }

      doc.save("Etiquetas.pdf"); // Salva o PDF com o nome "Etiquetas.pdf".
    };

    try {
      await generateBarcodes(); // Chama a função para gerar os códigos de barras.
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error); // Log de erro se houver um problema ao gerar o PDF.
    } finally {
      setLoading(false); // Define o estado de carregamento como falso ao final do processo.
    }
  };

  // Renderização do componente.
  return (
    <div className="container"> {/* Container principal */}
      <img src="/logo.png" alt="Logo" className="logo" /> {/* Logo da aplicação */}
      <h1>Impressão de Etiquetas</h1> {/* Título da página */}
      <p>Importar CSV</p> {/* Instrução para o usuário */}
      <input type="file" accept=".csv" onChange={handleFileUpload} className="fileInput" /> {/* Input para upload do CSV */}
      <button onClick={generatePDF} disabled={loading} className="button"> {/* Botão para gerar PDF */}
        {loading ? 'Gerando...' : 'Gerar Etiquetas'} {/* Texto dinâmico baseado no estado de carregamento */}
      </button>
    </div>
  );
}

