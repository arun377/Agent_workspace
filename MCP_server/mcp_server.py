import os
import markdown2
from xhtml2pdf import pisa
from fastmcp import FastMCP

# Initialize the MCP Server
mcp = FastMCP("PDFGenerator")

def normalize_markdown(md_content: str) -> str:
    """Basic normalization in case the LLM outputs weird formatting."""
    return md_content.strip()

@mcp.tool()
def generate_pdf_report(md_content: str, title: str = "", output_filename: str = "output.pdf") -> str:
    """
    Converts Markdown text into a beautifully formatted PDF file.
    
    Args:
        md_content: The markdown content to be converted into the PDF.
        title: The title of the document to display at the top.
        output_filename: The name of the file to save (e.g., 'report.pdf').
        
    Returns:
        A string containing the absolute file path where the PDF was saved.
    """
    clean_md = normalize_markdown(md_content)

    html_content = markdown2.markdown(
        clean_md, 
        extras=["tables", "fenced-code-blocks", "cuddled-lists", "break-on-newline"]
    )

    left_footer_text = "" 

    html_template = f"""
    <html>
    <head>
        <style>
            @page {{
                size: A4;
                margin: 40px 60px;
                @frame footer_frame {{
                    -pdf-frame-content: footer_content;
                    bottom: 10pt;
                    margin-left: 60px;
                    margin-right: 60px;
                    height: 20pt;
                }}
            }}
            body {{ font-family: Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #333; }}
            
            /* --- Footer Specific Styling --- */
            #footer_content {{ font-size: 8pt; color: #555; font-family: Helvetica, Arial, sans-serif; }}
            .footer-table {{ width: 100%; border: none; margin: 0; table-layout: auto; }}
            .footer-table td {{ border: none; padding: 0; vertical-align: bottom; font-size: 8pt; }}
            .footer-left {{ text-align: left; font-style: italic; width: 85%; }}
            .footer-right {{ text-align: right; width: 15%; white-space: nowrap; }}

            /* --- Main Content Styling --- */
            .doc-title {{ text-align: center; font-size: 24pt; font-weight: bold; margin-bottom: 25px; color: #003366; border-bottom: 2px solid #003366; padding-bottom: 10px; }}
            h1 {{ font-size: 18pt; margin-top: 25px; margin-bottom: 10px; color: #003366; border-bottom: 1px solid #ddd; }}
            h2 {{ font-size: 15pt; margin-top: 20px; margin-bottom: 8px; color: #005500; }}
            h3 {{ font-size: 13pt; margin-top: 15px; margin-bottom: 6px; color: #993300; }}
            h4 {{ font-size: 11pt; font-weight: bold; margin-top: 10px; margin-bottom: 4px; }}
            p {{ margin-bottom: 8px; text-align: justify; }}
            ul, ol {{ margin-top: 5px; margin-bottom: 10px; padding-left: 20px; }}
            li {{ margin-bottom: 4px; }}
            
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; table-layout: fixed; border: 1px solid #ddd; }}
            th {{ background-color: #f2f2f2; font-weight: bold; color: #333; border: 1px solid #bbb; padding: 6px; font-size: 10pt; }}
            td {{ border: 1px solid #bbb; padding: 6px; font-size: 10pt; vertical-align: top; word-wrap: break-word; }}
            
            pre {{ background-color: #f5f5f5; border: 1px solid #ccc; padding: 10px; border-radius: 4px; font-family: Consolas, monospace; font-size: 9pt; white-space: pre-wrap; word-break: break-all; }}
            code {{ font-family: Courier; background-color: #f3f4f6; padding: 2px 4px; font-size: 90%; font-weight: bold; }}
            blockquote {{ border-left: 4px solid #003366; padding-left: 10px; color: #555; font-style: italic; }}
        </style>
    </head>
    <body>
        <div id="footer_content">
            <table class="footer-table">
                <tr>
                    <td class="footer-left">{left_footer_text}</td>
                    <td class="footer-right">Page <pdf:pagenumber> of <pdf:pagecount></td>
                </tr>
            </table>
        </div>
        {f"<div class='doc-title'>{title}</div>" if title else ""}
        {html_content}
    </body>
    </html>
    """

    # Enforce .pdf extension
    if not output_filename.endswith('.pdf'):
        output_filename += ".pdf"
        
    # Generate Absolute File Path
    file_path = os.path.abspath(output_filename)

    with open(file_path, "wb") as f:
        pisa_status = pisa.CreatePDF(html_template, dest=f)
    
    if pisa_status.err:
        raise Exception(f"Error during PDF generation: {pisa_status.err}")

    # Returning the absolute file path so the LLM knows exactly where it is saved
    return f"Success! The PDF has been saved locally at: {file_path}"

if __name__ == "__main__":
    # Start the server listening on standard input/output
    mcp.run()