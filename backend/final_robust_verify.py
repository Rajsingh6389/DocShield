import sys
import os
import re
import json

# Simulate the class for testing
class MockService:
    def _parse_bot_response(self, text: str):
        # Clean the text slightly for easier parsing but keep the original for raw_text
        clean_text = text.replace("**", "").replace("`", "").strip()

        result = {
            "name": "N/A",
            "father_name": "N/A",
            "phones": [],
            "passport": "N/A",
            "region": "N/A",
            "address": "N/A",
            "addresses": [],
            "nickname": "N/A",
            "email": "N/A",
            "description": "N/A",
            "raw_text": text
        }
        
        if not text:
            return result
            
        # Extract preamble/description (everything before the first known icon or field label)
        desc_match = re.search(r"^(.*?)(?=\s*(?:📞|👤|👨|🃏|🗺️|🏘️|🏷️|📧|Telephone:|Full name:|Passport|Document|Region:|Adres:|Nickname:|Email:))", clean_text, re.DOTALL | re.IGNORECASE)
        if desc_match:
            result["description"] = desc_match.group(1).strip()

        # Extract Full Name (👤)
        name_match = re.search(r"(?:👤)?\s*Full name:\s*(.*)", clean_text, re.IGNORECASE)
        if name_match: result["name"] = name_match.group(1).strip()
        
        # Extract Father's Name (👨)
        father_match = re.search(r"(?:👨)?\s*(?:The )?name of the father:\s*(.*)", clean_text, re.IGNORECASE)
        if father_match: result["father_name"] = father_match.group(1).strip()
        
        # Extract Phones (📞)
        phone_matches = re.findall(r"(?:📞)?\s*Telephone:\s*(\d+)", clean_text, re.IGNORECASE)
        if phone_matches: result["phones"] = list(dict.fromkeys(phone_matches)) # Unique phones, keep order
        
        # Extract Passport / Document Number (🃏)
        doc_match = re.search(r"(?:🃏)?\s*(?:Passport|Document) number:\s*(.*)", clean_text, re.IGNORECASE)
        if doc_match: result["passport"] = doc_match.group(1).strip()
        
        # Extract Region (🗺️)
        region_match = re.search(r"(?:🗺️)?\s*Region:\s*(.*)", clean_text, re.IGNORECASE)
        if region_match: result["region"] = region_match.group(1).strip()

        # Extract Nickname (🏷️)
        nick_match = re.search(r"(?:🏷️)?\s*Nickname:\s*(.*)", clean_text, re.IGNORECASE)
        if nick_match: result["nickname"] = nick_match.group(1).strip()
        
        # Extract Email (📧)
        email_match = re.search(r"(?:📧)?\s*Email:\s*(.*)", clean_text, re.IGNORECASE)
        if email_match: result["email"] = email_match.group(1).strip()
        
        # Extract Address (🏘️ Adres:) - handle multi-line and multiple addresses
        address_matches = re.findall(r"(?:🏘️)?\s*Adres:\s*(.*?)(?=\s*(?:📞|👤|👨|🃏|🗺️|🏘️|🏷️|📧|Telephone:|Full name:|Passport|Document|Region:|Adres:|Nickname:|Email:|$))", clean_text, re.DOTALL | re.IGNORECASE)
        if address_matches: 
            # Clean up newlines and extra spaces
            cleaned_addresses = [re.sub(r'\s+', ' ', a.strip()) for a in address_matches if a.strip()]
            result["addresses"] = list(dict.fromkeys(cleaned_addresses))
            result["address"] = " | ".join(result["addresses"])
        
        return result

test_text = """
💾HiTeckGroop.in

At the beginning of 2025, a huge leak with the data of Indian cellular operators began to spread on the network. The HITECKGROOP website is declared as a source, but this information is unverified. The data contains 1.8 billion records, however, the number of unique users below, about 300 million. Each record indicated the full name, the name of the father, and the number of the document. Most often this is the Aadhaar number, but the taxpayer’s passports or numbers were also found. There were up to two phones in each line, however, since several records had several records for one user, the total number of well -known phones sometimes reached several tens. Some records also had nicknames and emails.

**📞Telephone: ** `916395468408`
**📞Telephone: ** `918279372164`
**📞Telephone: ** `918923759877`
**📞Telephone: ** `918630820486`
**🏘️Adres: ** S/O Netrapal Singh,Sikandra Rao,KizerpurSikandra RaoHHathras,Uttar Pradesh,204215 
**🏘️Adres: ** S/O Netrapal Singh,KIZERPURSikandra Rao,NA,KizerpurSiikandra RaoHathras,NA,Uttar Pradesh,204215
**🏘️Adres: ** S/O Netrapal Singh,KIZERPUR Sikandra Rao,NA,Kizerpur  Sikandra Rao Hathras,NA,Uttar Pradesh,204215
**🃏Document number: ** `228449219714`
**👤Full name: ** Netrapal Singh
**👨The name of the father: ** Videsh Kumar
**🗺️ Region: ** JIO UPE UPW;JIO UPW
"""

service = MockService()
res = service._parse_bot_response(test_text)

with open(r"c:\all\DocuShield\backend\final_robust_verify.json", "w", encoding="utf-8") as f:
    json.dump(res, f, indent=2, ensure_ascii=False)
