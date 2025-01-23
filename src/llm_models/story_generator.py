from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

class StoryGenerator:
    def __init__(self):
        self.model_name = "google/flan-t5-large"
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            self.model_name,
            device_map="auto",  # Automatically choose best device (CPU/GPU)
            torch_dtype=torch.float16  # Use FP16 for better memory efficiency
        )
        
    def generate_story(self, keywords, max_length=500):
        """
        Generate a children's story based on input keywords.
        
        Args:
            keywords (str): Keywords or prompt for the story
            max_length (int): Maximum length of the generated story
            
        Returns:
            str: Generated story
        """
        prompt = (
            f"Write a short children's story using these keywords: {keywords}. "
            "Make it engaging, appropriate for children, and include a moral lesson. "
            "The story should be creative and easy to understand."
        )
        
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        
        outputs = self.model.generate(
            inputs.input_ids,
            max_length=max_length,
            num_beams=5,  # Beam search for better quality
            temperature=0.7,  # Add some randomness
            no_repeat_ngram_size=3,  # Avoid repetition
            top_k=50,
            top_p=0.9,
            do_sample=True,
            early_stopping=True
        )
        
        story = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return story 