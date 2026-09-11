with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re

listeners = """        $('pfOut').addEventListener('click', () => this.signOut());
        
        const avInput = $('pfAvatar');
        const cropModal = $('cropModal');
        const cropImage = $('cropImage');
        const cropCancel = $('cropCancel');
        const cropSave = $('cropSave');
        const avDelBtn = $('pfAvatarDelete');
        const avPrev = $('pfAvatarPreview');

        if (avInput && cropModal) {
          avInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
              const reader = new FileReader();
              reader.onload = (re) => {
                cropImage.src = re.target.result;
                cropModal.style.display = 'flex';
                if (this.cropper) { this.cropper.destroy(); }
                this.cropper = new Cropper(cropImage, {
                  aspectRatio: 1,
                  viewMode: 1,
                  background: false,
                  autoCropArea: 1,
                  responsive: true
                });
              };
              reader.readAsDataURL(e.target.files[0]);
            }
          });
          
          cropCancel.addEventListener('click', () => {
            cropModal.style.display = 'none';
            avInput.value = '';
            if (this.cropper) { this.cropper.destroy(); this.cropper = null; }
          });
          
          cropSave.addEventListener('click', () => {
            if (!this.cropper) return;
            const canvas = this.cropper.getCroppedCanvas({ width: 400, height: 400 });
            canvas.toBlob((blob) => {
              this.avatarBlob = blob;
              this.avatarDelete = false;
              avPrev.src = URL.createObjectURL(blob);
              avPrev.style.display = 'block';
              avDelBtn.style.display = 'inline-block';
              cropModal.style.display = 'none';
              if (this.cropper) { this.cropper.destroy(); this.cropper = null; }
            }, 'image/jpeg', 0.9);
          });
        }
        
        if (avDelBtn) {
          avDelBtn.addEventListener('click', () => {
            this.avatarBlob = null;
            this.avatarDelete = true;
            if (avInput) avInput.value = '';
            avPrev.src = '';
            avPrev.style.display = 'none';
            avDelBtn.style.display = 'none';
          });
        }
"""
js = re.sub(r"\$\('pfOut'\)\.addEventListener\('click', \(\) => this\.signOut\(\)\);", listeners, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
