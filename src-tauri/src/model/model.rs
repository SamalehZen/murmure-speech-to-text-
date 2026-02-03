use anyhow::Result;
use log::debug;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const MODEL_FILENAME: &str = "parakeet-tdt-0.6b-v3-int8";

pub struct Model {
    app_handle: AppHandle,
}

impl Model {
    pub fn new(app_handle: AppHandle) -> Result<Self> {
        Ok(Self { app_handle })
    }

    pub fn get_model_path(&self) -> Result<PathBuf> {
        if let Ok(app_data_path) = crate::model::download::get_model_path(&self.app_handle) {
            if app_data_path.exists() && app_data_path.join("encoder.onnx").exists() {
                debug!("Model found in AppData: {}", app_data_path.display());
                return Ok(app_data_path);
            }
        }

        if let Some(model_path) =
            crate::utils::resources::resolve_resource_path(&self.app_handle, MODEL_FILENAME)
        {
            debug!("Model found in resources: {}", model_path.display());
            return Ok(model_path);
        }

        let exe_dir = self.app_handle.path().app_data_dir()?;
        let fallback_path = exe_dir.join("resources").join(MODEL_FILENAME);

        if fallback_path.exists() {
            debug!(
                "Model found at fallback location: {}",
                fallback_path.display()
            );
            return Ok(fallback_path);
        }

        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let dev_path = exe_dir.join("_up_").join("resources").join(MODEL_FILENAME);
                if dev_path.exists() {
                    debug!("Model found at dev location: {}", dev_path.display());
                    return Ok(dev_path);
                }
            }
        }

        anyhow::bail!(
            "Model '{}' not found. Please download it from Settings > STT Providers.",
            MODEL_FILENAME
        )
    }

    pub fn is_available(&self) -> bool {
        self.get_model_path().is_ok()
    }
}
