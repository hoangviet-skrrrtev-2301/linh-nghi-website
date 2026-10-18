# Đặt lịch tự động tải bản sao lưu từ server về máy Windows này mỗi ngày (chạy trên MÁY TÍNH, không chạy trên server).
#   Bước 1: chạy thử một lần cho chắc:  npm run pull-backup -- --server root@IP --path /var/www/linh-nghi --to D:\SaoLuuLinhNghi --save
#   Bước 2: mở PowerShell trong thư mục dự án và chạy:  powershell -ExecutionPolicy Bypass -File deploy\dat-lich-tai-sao-luu.ps1 -Time 04:30
# Nếu máy đang tắt đúng giờ đó, Windows sẽ chạy bù khi bật máy lại. Xem kết quả trong file pull-backup.log ở thư mục lưu bản sao lưu.
# Xóa lịch:  Unregister-ScheduledTask -TaskName LinhNghi-TaiSaoLuu -Confirm:$false
param(
  [string]$Time = '04:30',
  [string]$TaskName = 'LinhNghi-TaiSaoLuu'
)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $project '.pull-backup.json'))) {
  Write-Host 'Chưa có cấu hình. Chạy bước 1 (npm run pull-backup -- ... --save) trước.' -ForegroundColor Yellow
  exit 1
}
$node = (Get-Command node -ErrorAction Stop).Source
$action = New-ScheduledTaskAction -Execute $node -Argument 'backend/scripts/pull-backup.js' -WorkingDirectory $project
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Tải bản sao lưu website Linh Nghi từ server về máy' -Force | Out-Null
Write-Host "Đã đặt lịch '$TaskName' chạy mỗi ngày lúc $Time (chạy bù khi bật máy nếu lỡ giờ)." -ForegroundColor Green
Write-Host "Chạy thử ngay: Start-ScheduledTask -TaskName $TaskName"
