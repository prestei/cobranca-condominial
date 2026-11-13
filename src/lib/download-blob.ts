/** Dispara download no navegador de forma compatível (Chrome, Firefox, Safari). */
export function downloadBlob(conteudo: Blob, nomeArquivo: string) {
  if (typeof document === "undefined") return;

  const url = URL.createObjectURL(conteudo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
