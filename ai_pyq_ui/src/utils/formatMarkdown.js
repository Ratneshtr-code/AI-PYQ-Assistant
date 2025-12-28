// src/utils/formatMarkdown.js
/**
 * Format markdown text to HTML with premium styling
 * Same formatting as ExplanationWindow
 */
export function formatMarkdown(text) {
    if (!text) return "";
    
    // Escape HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    // Define section header colors and styles
    const sectionStyles = {
        'Core Concept': { color: '#2563eb', icon: '💡' },
        'Why Correct': { color: '#2563eb', icon: '✅' },
        'Why Incorrect': { color: '#2563eb', icon: '❌' },
        'Key Facts': { color: '#2563eb', icon: '📌' },
        'Important Points': { color: '#2563eb', icon: '⭐' },
        'Key Functions': { color: '#2563eb', icon: '⚙️' },
        'What It Actually Represents': { color: '#2563eb', icon: '🔍' },
        'Where It Would Be Correct': { color: '#2563eb', icon: '📍' },
        'Difference from Correct Answer': { color: '#2563eb', icon: '⚖️' },
        'Common Confusion': { color: '#2563eb', icon: '⚠️' },
        'Legal/Constitutional Basis': { color: '#2563eb', icon: '⚖️' },
        'Historical Context': { color: '#2563eb', icon: '📜' },
        'Why Others Are Wrong': { color: '#2563eb', icon: '🚫' },
        'Trick': { color: '#2563eb', icon: '🎯' },
        'Mnemonic': { color: '#2563eb', icon: '🧠' },
        'Examples': { color: '#2563eb', icon: '📝' },
        'Current Context': { color: '#2563eb', icon: '🔄' },
        'Six Fundamental Rights': { color: '#2563eb', icon: '📋' },
        'Answer to the Question': { color: '#2563eb', icon: '✅' },
        'Definition': { color: '#2563eb', icon: '📖' },
        'Key Characteristics': { color: '#2563eb', icon: '🔑' },
    };
    
    // Function to detect and style section headers
    const styleSectionHeader = (headerText) => {
        // Remove colons and extra spaces
        const cleanHeader = headerText.replace(/[:：]/g, '').trim();
        
        // Use blue color for all headers
        const blueColor = '#2563eb';
        
        // Find matching icon
        let icon = '📌'; // default icon
        for (const [key, style] of Object.entries(sectionStyles)) {
            if (cleanHeader.includes(key) || headerText.includes(key)) {
                icon = style.icon;
                break;
            }
        }
        
        return `<div class="explanation-section-header" style="color: ${blueColor};">
            <span class="section-icon">${icon}</span>
            <span class="section-title">${headerText.replace(/\*\*/g, '')}</span>
        </div>`;
    };
    
    // Process section headers FIRST (before processing other bold text)
    // Match **Header:** or **Header: Subtitle** at start of line or after newlines
    // Split by lines to process more reliably
    const headerLines = html.split('\n');
    const processedHeaderLines = headerLines.map((line, index) => {
        const trimmed = line.trim();
        
        // Check if line starts with ** and contains : (likely a section header)
        if (trimmed.startsWith('**') && trimmed.includes(':')) {
            // Extract header content (remove ** markers)
            const headerMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
            if (headerMatch) {
                const headerContent = headerMatch[1];
                // Check if it matches any known section header
                const knownHeaders = Object.keys(sectionStyles);
                const matchesKnown = knownHeaders.some(key => 
                    headerContent.includes(key) || key.includes(headerContent.split(':')[0].trim())
                );
                
                if (matchesKnown || headerContent.includes(':')) {
                    // This is a section header - style it
                    return styleSectionHeader(headerContent);
                }
            }
        }
        return line; // Return original line if not a header
    });
    
    html = processedHeaderLines.join('\n');
    
    // Convert markdown headers (###, ##, #)
    html = html.replace(/^### (.*$)/gim, "<h3 class='explanation-h3'>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2 class='explanation-h2'>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1 class='explanation-h1'>$1</h1>");
    
    // Bold text (process remaining bold that wasn't converted to headers)
    html = html.replace(/\*\*(.*?)\*\*/g, (match, content) => {
        // Skip if already processed as section header
        if (content.includes('<div') || content.includes('section')) {
            return match;
        }
        return `<strong class='explanation-bold'>${content}</strong>`;
    });
    html = html.replace(/__(.*?)__/g, "<strong class='explanation-bold'>$1</strong>");
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, (match, content) => {
        // Skip if it's part of a list marker or already processed
        if (content.includes('<') || content.includes('**')) {
            return match;
        }
        return `<em>${content}</em>`;
    });
    html = html.replace(/_(.*?)_/g, "<em>$1</em>");
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");
    
    // Process lists with proper nesting support
    // Handle both regular and nested lists (indented with 4+ spaces)
    const listLines = html.split('\n');
    const processedListLines = [];
    let currentListLevel = -1;
    const listStack = [];
    
    for (let i = 0; i < listLines.length; i++) {
        const line = listLines[i];
        const trimmed = line.trim();
        const leadingSpaces = line.length - trimmed.length;
        const indentLevel = Math.floor(leadingSpaces / 4); // 4 spaces = 1 level
        
        // Check if it's a list item
        const listMatch = trimmed.match(/^(\*|-|\d+\.)\s+(.+)$/);
        
        if (listMatch && !trimmed.startsWith('<')) {
            const [, marker, content] = listMatch;
            
            // Close lists if we're going back to a previous level
            while (listStack.length > indentLevel + 1) {
                processedListLines.push('</ul>');
                listStack.pop();
            }
            
            // Open new nested list if needed
            if (indentLevel >= listStack.length) {
                for (let l = listStack.length; l <= indentLevel; l++) {
                    const isNested = l > 0;
                    processedListLines.push(`<ul class="explanation-list${isNested ? ' explanation-nested-list' : ''}">`);
                    listStack.push(l);
                }
            }
            
            processedListLines.push(`<li class="explanation-list-item">${content}</li>`);
        } else {
            // Close all open lists if we hit a non-list line (but not if it's already HTML)
            if (listStack.length > 0 && !trimmed.startsWith('<') && trimmed.length > 0) {
                while (listStack.length > 0) {
                    processedListLines.push('</ul>');
                    listStack.pop();
                }
            }
            processedListLines.push(line);
        }
    }
    
    // Close any remaining open lists
    while (listStack.length > 0) {
        processedListLines.push('</ul>');
        listStack.pop();
    }
    
    html = processedListLines.join('\n');
    
    // Clean up: merge consecutive ul tags that shouldn't be separate
    html = html.replace(/<\/ul>\s*<ul class="explanation-list/g, '<ul class="explanation-list');
    
    // Fix excessive spacing: reduce triple+ newlines to double, then handle double newlines
    html = html.replace(/\n{3,}/g, "\n\n");
    
    // Split by double newlines to create sections, but preserve single newlines within sections
    const sections = html.split(/\n\n/);
    html = sections
        .map(section => {
            const trimmed = section.trim();
            if (!trimmed) return '';
            
            // If it's already a styled section header or list, return as is
            if (trimmed.startsWith('<div class="explanation-section-header') || 
                trimmed.startsWith('<ul') || 
                trimmed.startsWith('<h')) {
                return trimmed;
            }
            
            // Convert single newlines to <br/> within paragraphs
            const withBreaks = trimmed.replace(/\n/g, '<br/>');
            
            // Wrap in paragraph if not already wrapped
            if (!trimmed.startsWith('<')) {
                return `<p class='explanation-paragraph'>${withBreaks}</p>`;
            }
            return trimmed;
        })
        .filter(s => s.length > 0)
        .join('');
    
    // Final cleanup: remove empty paragraphs
    html = html.replace(/<p class='explanation-paragraph'><\/p>/g, '');
    
    return html;
}

