# app/prompt_loader.py
"""
Prompt Loader - Loads and renders prompts from files with template variables
"""
import os
from pathlib import Path
from typing import Dict, Optional, Tuple


class PromptLoader:
    """Load prompts from files and render with template variables"""
    
    def __init__(self, prompts_dir: Optional[str] = None):
        """
        Initialize prompt loader
        
        Args:
            prompts_dir: Directory containing prompt files (default: prompts/ in project root)
        """
        if prompts_dir is None:
            # Default to prompts/ directory in project root
            project_root = Path(__file__).parent.parent
            prompts_dir = project_root / "prompts"
        
        if isinstance(prompts_dir, str):
            self.prompts_dir = Path(prompts_dir)
        else:
            self.prompts_dir = prompts_dir
        
        if not self.prompts_dir.exists():
            raise FileNotFoundError(
                f"Prompts directory not found: {self.prompts_dir}\n"
                f"Please create the prompts directory and add prompt files."
            )
    
    def load_prompt_file(self, filename: str) -> str:
        """
        Load a prompt file
        
        Args:
            filename: Name of the prompt file (e.g., "concept_explanation_prompt.txt")
            
        Returns:
            File contents as string
        """
        file_path = self.prompts_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(
                f"Prompt file not found: {file_path}\n"
                f"Available files: {list(self.prompts_dir.glob('*.txt'))}"
            )
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    
    def render_template(self, template: str, variables: Dict[str, str]) -> str:
        """
        Render template with variables
        
        Args:
            template: Template string with {{VARIABLE}} placeholders
            variables: Dictionary of variable names to values
            
        Returns:
            Rendered template string
        """
        result = template
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value) if value else "")
        return result
    
    def load_concept_prompts(self) -> Tuple[str, str]:
        """
        Load concept explanation prompts (system + prompt)
        
        Returns:
            Tuple of (system_instruction, prompt_template)
        """
        system = self.load_prompt_file("concept_explanation_system.txt")
        prompt_template = self.load_prompt_file("concept_explanation_prompt.txt")
        return system, prompt_template
    
    def load_correct_option_prompts(self) -> Tuple[str, str]:
        """
        Load correct option explanation prompts (system + prompt)
        
        Returns:
            Tuple of (system_instruction, prompt_template)
        """
        system = self.load_prompt_file("correct_option_system.txt")
        prompt_template = self.load_prompt_file("correct_option_prompt.txt")
        return system, prompt_template
    
    def load_wrong_option_prompts(self) -> Tuple[str, str]:
        """
        Load wrong option explanation prompts (system + prompt)
        
        Returns:
            Tuple of (system_instruction, prompt_template)
        """
        system = self.load_prompt_file("wrong_option_system.txt")
        prompt_template = self.load_prompt_file("wrong_option_prompt.txt")
        return system, prompt_template
    
    def build_concept_prompt(
        self,
        question_text: str,
        options: Dict[str, str],
        correct_option: str,
        exam: Optional[str] = None,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        year: Optional[int] = None
    ) -> Tuple[str, str]:
        """
        Build concept explanation prompt from template
        
        Returns:
            Tuple of (system_instruction, rendered_prompt)
        """
        system_instruction, prompt_template = self.load_concept_prompts()
        
        # Build context info (only subject - exam, year, topic removed per user feedback)
        context_parts = []
        if subject:
            context_parts.append(f"**Subject:** {subject}")
        
        context_info = "\n".join(context_parts)
        if context_info:
            context_info = f"\n{context_info}\n"
        
        # Render template (options removed - not needed for concept explanation per user feedback)
        variables = {
            "CONTEXT_INFO": context_info,
            "QUESTION_TEXT": question_text
        }
        
        prompt = self.render_template(prompt_template, variables)
        return system_instruction, prompt
    
    def build_correct_option_prompt(
        self,
        question_text: str,
        correct_option_text: str,
        correct_option_letter: str,
        all_options: Dict[str, str],
        exam: Optional[str] = None,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        year: Optional[int] = None
    ) -> Tuple[str, str]:
        """
        Build correct option explanation prompt from template
        
        Returns:
            Tuple of (system_instruction, rendered_prompt)
        """
        system_instruction, prompt_template = self.load_correct_option_prompts()
        
        # Build context info (only subject - exam, year, topic removed per user feedback)
        context_parts = []
        if subject:
            context_parts.append(f"**Subject:** {subject}")
        
        context_info = "\n".join(context_parts)
        if context_info:
            context_info = f"\n{context_info}\n"
        
        # Render template
        variables = {
            "CONTEXT_INFO": context_info,
            "QUESTION_TEXT": question_text,
            "OPTION_A": all_options.get('option_a', 'N/A'),
            "OPTION_B": all_options.get('option_b', 'N/A'),
            "OPTION_C": all_options.get('option_c', 'N/A'),
            "OPTION_D": all_options.get('option_d', 'N/A'),
            "CORRECT_OPTION_LETTER": correct_option_letter,
            "CORRECT_OPTION_TEXT": correct_option_text
        }
        
        prompt = self.render_template(prompt_template, variables)
        return system_instruction, prompt
    
    def build_wrong_option_prompt(
        self,
        question_text: str,
        wrong_option_text: str,
        wrong_option_letter: str,
        correct_option_text: str,
        correct_option_letter: str,
        all_options: Dict[str, str],
        exam: Optional[str] = None,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        year: Optional[int] = None
    ) -> Tuple[str, str]:
        """
        Build wrong option explanation prompt from template
        
        Returns:
            Tuple of (system_instruction, rendered_prompt)
        """
        system_instruction, prompt_template = self.load_wrong_option_prompts()
        
        # Build context info (only subject - exam, year, topic removed per user feedback)
        context_parts = []
        if subject:
            context_parts.append(f"**Subject:** {subject}")
        
        context_info = "\n".join(context_parts)
        if context_info:
            context_info = f"\n{context_info}\n"
        
        # Render template
        variables = {
            "CONTEXT_INFO": context_info,
            "QUESTION_TEXT": question_text,
            "OPTION_A": all_options.get('option_a', 'N/A'),
            "OPTION_B": all_options.get('option_b', 'N/A'),
            "OPTION_C": all_options.get('option_c', 'N/A'),
            "OPTION_D": all_options.get('option_d', 'N/A'),
            "WRONG_OPTION_LETTER": wrong_option_letter,
            "WRONG_OPTION_TEXT": wrong_option_text,
            "CORRECT_OPTION_LETTER": correct_option_letter,
            "CORRECT_OPTION_TEXT": correct_option_text
        }
        
        prompt = self.render_template(prompt_template, variables)
        return system_instruction, prompt


# Global instance
_prompt_loader: Optional[PromptLoader] = None


def get_prompt_loader() -> PromptLoader:
    """Get or create prompt loader instance (singleton)"""
    global _prompt_loader
    if _prompt_loader is None:
        _prompt_loader = PromptLoader()
    return _prompt_loader

