import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"      const patch = \{\n        id: user\.id,[\s\S]*?residence: residence\n      \};"
replacement = """      let avatarUrl = this.profile ? this.profile.avatar_url : '';
      const avInput = $('pfAvatar');
      if (avInput && avInput.files && avInput.files[0]) {
        const file = avInput.files[0];
        const path = user.id + '_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const { error: avErr } = await this.supabase.storage.from('avatars').upload(path, file, { upsert: true });
        if (avErr) {
          msg.className = 'mp-msg err';
          msg.textContent = 'Failed to upload profile picture: ' + avErr.message;
          return;
        }
        const { data: pubUrlData } = this.supabase.storage.from('avatars').getPublicUrl(path);
        if (pubUrlData && pubUrlData.publicUrl) {
          avatarUrl = pubUrlData.publicUrl;
        }
      }

      const patch = {
        id: user.id,
        email: user.email,
        full_name: name,
        dob: $('pfDob').value || null,
        phone: $('pfPhone').value.trim(),
        voice_part: $('pfVoice').value,
        study_status: study,
        course_program: course,
        university: university,
        expected_grad_year: expectedGrad,
        grad_year: gradYear,
        residence_type: resType,
        residence: residence
      };
      if (avatarUrl) {
        patch.avatar_url = avatarUrl;
      }"""

js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
