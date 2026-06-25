import time
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_workflow():
    print("=== [1] START SESSION TEST ===")
    start_payload = {
        "product_name": "달콤한 딸기 크림 타르트",
        "product_desc": "신선한 국산 딸기가 듬뿍 올라간 수제 크림 타르트. 매일 아침 구워냅니다.",
        "target_audience": "디저트를 사랑하는 2030 여성",
        "tone_and_manner": "화사하고 달콤한"
    }
    
    response = requests.post(f"{BASE_URL}/api/start", json=start_payload)
    if response.status_code != 200:
        print(f"[FAIL] Session start failed: {response.text}")
        return
        
    res_data = response.json()
    thread_id = res_data["thread_id"]
    state = res_data["state"]
    next_node = res_data["next"]
    
    print(f"[SUCCESS] Thread ID: {thread_id}")
    print(f"[NEXT STEP] Waiting node: {next_node}")
    print(f"[DRAFT POST] Generated:\n{state['generated_post']}\n")
    
    time.sleep(1)

    print("=== [2] FEEDBACK ON POST TEST ===")
    feedback_payload = {
        "thread_id": thread_id,
        "stage": "post",
        "action": "reject",
        "feedback": "해시태그에 #인생타르트 #딸기맛집 두 개 추가해 줘."
    }
    
    response = requests.post(f"{BASE_URL}/api/feedback", json=feedback_payload)
    if response.status_code != 200:
        print(f"[FAIL] Feedback failed: {response.text}")
        return
        
    res_data = response.json()
    state = res_data["state"]
    print(f"[SUCCESS] Feedback processed. Next step: {res_data['next']}")
    print(f"[MODIFIED POST] Generated:\n{state['generated_post']}\n")
    
    time.sleep(1)

    print("=== [3] APPROVE POST TEST ===")
    approve_payload = {
        "thread_id": thread_id,
        "stage": "post",
        "action": "approve"
    }
    response = requests.post(f"{BASE_URL}/api/feedback", json=approve_payload)
    res_data = response.json()
    state = res_data["state"]
    print(f"[SUCCESS] Post approved. Next step: {res_data['next']}")
    print(f"[IMAGE PROMPT] Generated:\n{state['generated_image_prompt']}")
    print(f"[IMAGE URL] Generated:\n{state['generated_image_url']}\n")

    time.sleep(1)

    print("=== [4] APPROVE IMAGE TEST ===")
    approve_payload = {
        "thread_id": thread_id,
        "stage": "image",
        "action": "approve"
    }
    response = requests.post(f"{BASE_URL}/api/feedback", json=approve_payload)
    res_data = response.json()
    state = res_data["state"]
    print(f"[SUCCESS] Image approved. Next step: {res_data['next']}")
    print(f"[VIDEO SCRIPT] Generated:\n{state['generated_video_script']}")
    print(f"[VIDEO URL] Generated:\n{state['generated_video_url']}\n")

    time.sleep(1)

    print("=== [5] APPROVE VIDEO TEST ===")
    approve_payload = {
        "thread_id": thread_id,
        "stage": "video",
        "action": "approve"
    }
    response = requests.post(f"{BASE_URL}/api/feedback", json=approve_payload)
    res_data = response.json()
    state = res_data["state"]
    print(f"[SUCCESS] Video approved. Next step: {res_data['next']}")

    time.sleep(1)

    print("=== [6] PUBLISH TEST ===")
    publish_payload = {
        "thread_id": thread_id,
        "stage": "publish",
        "action": "approve",
        "publish_channels": ["instagram", "kakaotalk"]
    }
    response = requests.post(f"{BASE_URL}/api/feedback", json=publish_payload)
    res_data = response.json()
    state = res_data["state"]
    print(f"[SUCCESS] Publishing completed. Pipeline Finished={res_data['is_finished']}")
    print(f"[PUBLISH RESULTS] {state['publish_results']}")
    print(f"[MESSAGE] {res_data['message']}")

if __name__ == "__main__":
    # 서버 준비 대기
    time.sleep(1)
    test_workflow()
