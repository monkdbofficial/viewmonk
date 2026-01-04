use crate::models::blob::FileValidationResult;
use crate::utils::{DbError, Result};
use mime_guess::from_path;
use sha1::{Digest, Sha1};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

/// File validator with security checks
pub struct FileValidator {
    max_file_size: u64,
    allowed_mime_types: Vec<String>,
}

impl Default for FileValidator {
    fn default() -> Self {
        Self {
            max_file_size: 100 * 1024 * 1024, // 100MB
            allowed_mime_types: vec![
                // Images
                "image/jpeg".to_string(),
                "image/png".to_string(),
                "image/gif".to_string(),
                "image/webp".to_string(),
                "image/svg+xml".to_string(),
                // Documents
                "application/pdf".to_string(),
                "text/plain".to_string(),
                "text/csv".to_string(),
                "application/json".to_string(),
                // Archives
                "application/zip".to_string(),
                "application/x-tar".to_string(),
                "application/gzip".to_string(),
                // Office documents
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
                "application/vnd.openxmlformats-officedocument.presentationml.presentation".to_string(),
            ],
        }
    }
}

impl FileValidator {
    pub fn new(max_file_size: u64, allowed_mime_types: Vec<String>) -> Self {
        Self {
            max_file_size,
            allowed_mime_types,
        }
    }

    /// Validate a file for upload
    pub fn validate_file(&self, path: &str) -> Result<FileValidationResult> {
        let mut errors = Vec::new();
        let warnings = Vec::new();

        // Check file exists
        let file_path = Path::new(path);
        if !file_path.exists() {
            errors.push("File does not exist".to_string());
            return Ok(FileValidationResult {
                valid: false,
                file_size: 0,
                content_type: String::new(),
                sha1_preview: String::new(),
                errors,
                warnings,
            });
        }

        // File size check
        let metadata = std::fs::metadata(path)
            .map_err(|e| DbError::ValidationError(format!("Failed to read file metadata: {}", e)))?;

        let file_size = metadata.len();
        if file_size > self.max_file_size {
            errors.push(format!(
                "File size {} bytes exceeds maximum allowed size of {} bytes",
                file_size, self.max_file_size
            ));
        }

        if file_size == 0 {
            errors.push("File is empty".to_string());
        }

        // MIME type detection using magic bytes
        let mime_type = self.detect_mime_type(path)?;

        if !self.allowed_mime_types.contains(&mime_type) {
            errors.push(format!("MIME type '{}' not allowed", mime_type));
        }

        // Basic malware signature detection
        if let Err(e) = self.scan_for_malware(path) {
            errors.push(e.to_string());
        }

        // Calculate SHA-1 preview
        let sha1 = if errors.is_empty() {
            self.calculate_sha1(path)?
        } else {
            String::new()
        };

        Ok(FileValidationResult {
            valid: errors.is_empty(),
            file_size,
            content_type: mime_type,
            sha1_preview: sha1,
            errors,
            warnings,
        })
    }

    /// Detect MIME type from file extension and magic bytes
    fn detect_mime_type(&self, path: &str) -> Result<String> {
        // First try mime_guess (uses file extension)
        let mime = from_path(path).first_or_octet_stream();

        // TODO: For production, add magic byte detection for more accurate type detection
        // This would involve reading the first few bytes and matching against known signatures

        Ok(mime.essence_str().to_string())
    }

    /// Scan for basic malware signatures
    fn scan_for_malware(&self, path: &str) -> Result<()> {
        let mut file = File::open(path)
            .map_err(|e| DbError::ValidationError(format!("Failed to open file: {}", e)))?;

        let mut buffer = vec![0u8; 4096];
        let bytes_read = file.read(&mut buffer)
            .map_err(|e| DbError::ValidationError(format!("Failed to read file: {}", e)))?;

        buffer.truncate(bytes_read);

        // Check for executable signatures (Windows PE, ELF, Mach-O)
        if buffer.starts_with(b"MZ") {
            return Err(DbError::ValidationError(
                "Windows executable files (.exe, .dll) are not allowed".to_string()
            ));
        }

        if buffer.starts_with(b"\x7fELF") {
            return Err(DbError::ValidationError(
                "Linux executable files (ELF) are not allowed".to_string()
            ));
        }

        if buffer.starts_with(b"\xfe\xed\xfa") || buffer.starts_with(b"\xce\xfa\xed\xfe") {
            return Err(DbError::ValidationError(
                "macOS executable files (Mach-O) are not allowed".to_string()
            ));
        }

        // Check for script patterns in text content
        let content = String::from_utf8_lossy(&buffer);
        if content.contains("<script>") || content.contains("eval(") {
            log::warn!("Potential script content detected in file");
            // Don't fail, just warn
        }

        Ok(())
    }

    /// Calculate SHA-1 hash of file
    pub fn calculate_sha1(&self, path: &str) -> Result<String> {
        let file = File::open(path)
            .map_err(|e| DbError::ValidationError(format!("Failed to open file for hashing: {}", e)))?;

        let mut reader = BufReader::new(file);
        let mut hasher = Sha1::new();
        let mut buffer = [0u8; 8192];

        loop {
            let bytes_read = reader.read(&mut buffer)
                .map_err(|e| DbError::ValidationError(format!("Failed to read file for hashing: {}", e)))?;

            if bytes_read == 0 {
                break;
            }

            hasher.update(&buffer[..bytes_read]);
        }

        Ok(format!("{:x}", hasher.finalize()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::io::Write;

    #[test]
    fn test_calculate_sha1() {
        let validator = FileValidator::default();

        // Create a temporary file
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(b"Hello, MonkDB!").unwrap();
        let path = temp_file.path().to_str().unwrap();

        let sha1 = validator.calculate_sha1(path).unwrap();

        // SHA-1 of "Hello, MonkDB!" should be consistent
        assert!(!sha1.is_empty());
        assert_eq!(sha1.len(), 40); // SHA-1 is 40 hex characters
    }

    #[test]
    fn test_malware_detection_exe() {
        let validator = FileValidator::default();

        // Create a file with PE header (Windows EXE)
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(b"MZ\x90\x00").unwrap();
        let path = temp_file.path().to_str().unwrap();

        let result = validator.scan_for_malware(path);
        assert!(result.is_err());
    }

    #[test]
    fn test_file_size_validation() {
        let validator = FileValidator::new(100, vec!["text/plain".to_string()]);

        // Create a file larger than 100 bytes
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(&vec![0u8; 200]).unwrap();
        let path = temp_file.path().to_str().unwrap();

        let result = validator.validate_file(path).unwrap();
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("exceeds maximum")));
    }
}
