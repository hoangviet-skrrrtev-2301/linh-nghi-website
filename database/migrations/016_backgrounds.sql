-- Nền các khối: tách cài đặt nền của từng khối trang chủ ra nhóm riêng "backgrounds" (Giao diện › Nền các khối),
-- dùng chung cho chân trang, thanh thông báo, phần đầu các trang con... Chuyển nền đã đặt ở "Bố cục trang chủ" sang nhóm mới (không mất cài đặt).
-- Khối chưa có cài đặt (khối mới) tự dùng giá trị mặc định trong code.
INSERT INTO settings (key, value, updated_at)
SELECT 'backgrounds',
  json_object('blocks', (
    SELECT json_group_array(json_object(
      'key', json_extract(j.value, '$.key'),
      'bg_mode', COALESCE(json_extract(j.value, '$.bg_mode'), 'none'),
      'bg_color', COALESCE(json_extract(j.value, '$.bg_color'), '#f1ece1'),
      'bg_pattern', COALESCE(json_extract(j.value, '$.bg_pattern'), 'dots'),
      'bg_pattern_color', COALESCE(json_extract(j.value, '$.bg_pattern_color'), '#2e6b94'),
      'bg_pattern_strength', COALESCE(json_extract(j.value, '$.bg_pattern_strength'), 18),
      'bg_image', json_extract(j.value, '$.bg_image'),
      'bg_overlay', COALESCE(json_extract(j.value, '$.bg_overlay'), 35),
      'bg_overlay_color', COALESCE(json_extract(j.value, '$.bg_overlay_color'), '#000000'),
      'text_tone', COALESCE(json_extract(j.value, '$.text_tone'), 'auto')
    ))
    FROM json_each(CASE WHEN json_valid(s.value) THEN s.value ELSE '{}' END, '$.sections') j
    WHERE json_extract(j.value, '$.key') <> 'banner'
  )),
  datetime('now')
FROM settings s
WHERE s.key = 'home_layout' AND NOT EXISTS (SELECT 1 FROM settings WHERE key = 'backgrounds');
