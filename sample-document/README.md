# DealLens Sample Documents

[Back to the DealLens project README](../README.md)

This collection is reserved for short fictional contract pairs used to demonstrate and test the DealLens upload, comparison, impact-analysis, communication, and report workflows.

## Planned collection

There will eventually be exactly three original PDFs and three matching revised PDFs:

| Topic | Original | Revised |
|---|---|---|
| SaaS CRM Platform | `SaaS-CRM-Platform-Original.pdf` | `SaaS-CRM-Platform-Revised.pdf` |
| Fintech Expense Management | `Fintech-Expense-Management-Original.pdf` | `Fintech-Expense-Management-Revised.pdf` |
| E-commerce Multi-Vendor Platform | `Ecommerce-Multi-Vendor-Platform-Original.pdf` | `Ecommerce-Multi-Vendor-Platform-Revised.pdf` |

The matching revised document will contain meaningful contractual changes relative to its original. The documents will be short enough for quick demonstrations and testing.

## Folder structure

```text
sample-document/
├── README.md
├── SaaS-CRM-Platform/
├── Fintech-Expense-Management/
└── Ecommerce-Multi-Vendor-Platform/
```

The topic folders are intentionally empty until the separate document-creation task. `.gitkeep` files preserve the directories in Git.

## How to use the pairs

1. Create or select a DealLens deal.
2. Upload the topic's `Original.pdf` as the original document.
3. Upload the matching `Revised.pdf` as the revised document.
4. Run comparison to inspect detected changes.
5. Run impact analysis for validated AI assessments.
6. Generate a clarification email draft or PDF, TEXT, or JSON report.

Do not mix topics when testing a pair; each revised file is intended to correspond only to its matching original file.

## Important notes

- The six PDFs are not being generated in this task.
- No DOCX files are planned by this setup task.
- Do not copy previous long testing documents into these folders.
- The future documents are fictional and intended only for software demonstration and testing.
- They are not legal advice and must not be used as real contractual documents.
