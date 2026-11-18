# Troubleshooting

## The report says the file is not valid

Queue Definitions Atlas reads a JSON object with at least one of the sections users, vhosts, permissions, policies, queues, exchanges or bindings, as rabbitmqctl export_definitions and the management UI write them. Other JSON is reported as not a definitions export.

## The file is too large

Reports read files up to the size set in `queueDefinitionsAtlas.maxFileSizeMB` (50 MB by default and at most). VS Code passes files only up to 50 MB to extensions, so a larger file cannot be read by any extension: split it, or save a shorter one.

## The preview does not open

The report always opens as a Markdown document. If the preview stays closed, set `queueDefinitionsAtlas.openReportsAsPreview` to true and check that the built-in Markdown extension is enabled.

## Pro or the trial does not unlock

Run **Queue Definitions Atlas: Show Licence Status**. It tells whether a key is stored, whether it was checked, and how many trial days are left. Details are in [licence.md](licence.md).

## Something else

Run **Queue Definitions Atlas: Report A Problem**. It copies a diagnostics block (versions, settings, licence state; no file contents) and opens the issues page.
