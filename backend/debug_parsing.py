import sys
import os
import re
import json

# Simulate the class for testing
class MockService:
    def _parse_bot_response(self, text: str):
        result = {
            "name": "N/A",
            "father_name": "N/A",
            "phones": [],
            "passport": "N/A",
            "region": "N/A",
            "address": "N/A",
            "addresses": [],
            "raw_text": text
        }
        
        if not text:
            return result
            
        # Extract Full Name (👤)
        name_match = re.search(r"(?:👤)?\s*Full name:\s*(.*)", text, re.IGNORECASE)
        if name_match: result["name"] = name_match.group(1).strip()
        
        # Extract Father's Name (👨)
        father_match = re.search(r"(?:👨)?\s*(?:The )?name of the father:\s*(.*)", text, re.IGNORECASE)
        if father_match: result["father_name"] = father_match.group(1).strip()
        
        # Extract Phones (📞)
        phone_matches = re.findall(r"(?:📞)?\s*Telephone:\s*(\d+)", text, re.IGNORECASE)
        if phone_matches: result["phones"] = list(set(phone_matches)) # Unique phones
        
        # Extract Passport / Document Number (🃏)
        doc_match = re.search(r"(?:🃏)?\s*(?:Passport|Document) number:\s*(.*)", text, re.IGNORECASE)
        if doc_match: result["passport"] = doc_match.group(1).strip()
        
        # Extract Region (🗺️)
        region_match = re.search(r"(?:🗺️)?\s*Region:\s*(.*)", text, re.IGNORECASE)
        if region_match: result["region"] = region_match.group(1).strip()
        
        # Extract Address (🏘️ Adres:) - handle multi-line and multiple addresses
        address_matches = re.findall(r"(?:🏘️)?\s*Adres:\s*(.*?)(?=\s*(?:📞|👤|👨|🃏|🗺️|🏘️|Telephone:|Full name:|Passport|Document|Region:|Adres:|$))", text, re.DOTALL | re.IGNORECASE)
        if address_matches: 
            cleaned_addresses = [re.sub(r'\s+', ' ', a.strip()) for a in address_matches if a.strip()]
            result["addresses"] = list(dict.fromkeys(cleaned_addresses))
            result["address"] = " | ".join(result["addresses"])
        
        return result

test_text = """
📞Telephone:  916395468408
📞Telephone:  918279372164
📞Telephone:  918923759877
📞Telephone:  918630820486
🏘️Adres:  S/O Netrapal Singh,Sikandra Rao,KizerpurSikandra RaoHathras,Uttar Pradesh,204215 
🏘️Adres:  S/O Netrapal Singh,KIZERPURSikandra Rao,NA,KizerpurSikandra RaoHathras,NA,Uttar Pradesh,204215
🏘️Adres:  S/O Netrapal Singh,KIZERPUR Sikandra Rao,NA,Kizerpur Sikandra Rao Hathras,NA,Uttar Pradesh,204215
🃏Document number:  228449219714
👤Full name:  Netrapal Singh
👨The name of the father:  Videsh Kumar
🗺️ Region:  JIO UPE UPW;JIO UPW
"""

service = MockService()
res = service._parse_bot_response(test_text)

with open(r"c:\all\DocuShield\backend\debug_parsing.json", "w", encoding="utf-8") as f:
    json.dump(res, f, indent=2, ensure_ascii=False)
